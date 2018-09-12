var fbd = require( __dirname + '/funcionesBaseDatos.js');
var fr = require( __dirname + '/funcionesResponder.js');
var funcionesExtra = require( __dirname + '/funcionesExtra.js');
var funcionesArchivos = require( __dirname + '/funcionesArchivos.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
//var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

var seguroSemaforo = false;//se usa para asegurar que solo accede un cliente a un recurso

//------------------------PRIVADAS----------------------------------

//recorre todos los usuarios de la simulacion y coge sus tableros con sus respuestas
//reune todas las respuestas en un tableroGlobal
//marca los usuarios como no preparados
//mueve gente, realiza nacimientos
//
async function ejecutaPaso(respuesta, idSimulacion, paso){//, retrollamada){	
	const listaEspeciesSimulacion = await fbd.dameListaEspeciesSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	const fecundaciones = await fbd.dameFecundacionesSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	var i;
	//marca todos los usuarios como no preparados
	for(i=0;i<listaEspeciesSimulacion.length;i++){	
		var idUsuario = listaEspeciesSimulacion[i].ID_ESPECIE;	
		//se marca este usuario como no preparado a que el servidor ejecute el siguiente paso
		fbd.marcarPreparadoONoBBDD(idUsuario,0).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	}		
	//si es entrar en la simulacion
	if(paso<0){
		var tablaux;
		for(i=0;i<listaEspeciesSimulacion.length;i++){	
			var idUsuario = listaEspeciesSimulacion[i].ID_ESPECIE;
			tablaux=creaPasoInicial(respuesta,idSimulacion,idUsuario,0,function(){});	
		}
		fecundaciones = funcionesExtra.dameFecundacionesInactivasIniciales(tablaux);
		for(i=0;i<fecundaciones.length;i++){
			var fecundacion = fecundaciones[i];
			fbd.actualizaFecundacionSimulacionBBDD(idSimulacion,fecundacion);
		}	
		fbd.incrementaPasoSimulacionBBDD(idSimulacion);
		//retrollamada();
	}
	//si es algun paso de la simulacion
	else{
		//aniade las funciones de manera ordenada a una lista de funciones
		var listaParamMap = [];
		for(i=0;i<listaEspeciesSimulacion.length;i++){				
			var idUsuario = listaEspeciesSimulacion[i].ID_ESPECIE;							
			//encapsulamos todos los parametros en un solo objeto para usar map
			var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
			listaParamMap.push(paramMap);						
		}
		//ejecuta de manera ordenada el tratamiento de tableros de cada jugador		
		const resultados2 = await funcionesExtra.ejecutaSerieFuncionPorCadaElemento(listaParamMap,fbd.dameTableroPasoBBDD).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		var tableroGlobal = {"casillas":[],"individuos":[]};
		//actualiza de manera ordenada el tablero global con lo devuelto por la lista de lambdas, los tableros
		//recorre los indivs del primer tab
		var gente = resultados2[0].individuos;//coge los individuos de ese tablero, son el mismo num de indivs para todos los tableros
		tableroGlobal.casillas = resultados2[0].casillas;
		for(i=0;i<gente.length;i++){
			//guarda en ese indiv del tab global la info del indiv del tab de la especie a la que pertenece ese indiv
			var tabDeEspecieDeI = resultados2[gente[i].especie];
			tableroGlobal.individuos.push(tabDeEspecieDeI.individuos[i]);				
		}					
		funcionesExtra.movimientosNacimientos(tableroGlobal,fecundaciones);
		for(i=0;i<fecundaciones.length;i++){
			var fecundacion = fecundaciones[i];
			fbd.actualizaFecundacionSimulacionBBDD(idSimulacion,fecundacion);
		}				
		var tableroStringGlobal = JSON.stringify(tableroGlobal);
		//esto siguiente podria hacerse en paralelo? creo que si, deberia ser indiferente
		//ejecuta en serie la obtencion de codigos de cada jugador, lo devuelve ordenado	
		const resultados3 = await funcionesExtra.ejecutaSerieFuncionPorCadaElemento(listaParamMap,fbd.dameCodigosPasoBBDD).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));			
		var listaParamMap3 = [];
		for(i=0;i<listaEspeciesSimulacion.length;i++){
			var idUsuario3 = listaEspeciesSimulacion[i].ID_ESPECIE;
			var codM1=resultados3[i][0];
			var codH1=resultados3[i][1];
			var paramMap3 = {"idSim":idSimulacion,"paso":paso+1,"idUsu":idUsuario3,
				"tab":tableroStringGlobal,"codM":codM1,"codH":codH1};
			listaParamMap3.push(paramMap3);
		}				
		//ejecuta en paralelo la creacion del sig paso, el mismo para cada jugador
		const resultados4 = await Promise.all(listaParamMap3.map(fbd.creaPasoUsuarioBBDD)).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));	
		fbd.incrementaPasoSimulacionBBDD(idSimulacion);
		//retrollamada();
	}
}

async function creaPasoInicial(respuesta, idSimulacion, idUsuario, paso){
	//crea el paso0 para el jugador que se acaba de unir
	var tablero = funcionesExtra.dameTableroInicial();
	var tableroString = JSON.stringify(tablero);	
	const codigosMachosHembras = await fbd.dameCodigosEspecieBBDD(idUsuario).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));	
	var paramMap = {"idSim":idSimulacion,"paso":paso,"idUsu":idUsuario,
				"tab":tableroString,"codM":codigosMachosHembras[0],"codH":codigosMachosHembras[1]};
	const resultados = await fbd.creaPasoUsuarioBBDD(paramMap).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));		
	return tablero;
}

function muestraErrorCuenta(error){
	funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: this.respuesta, mensaje:error}));
	return null;
}

//------------------------PUBLICAS----------------------------------
//coge el tablero del paso actual, extrae la lista de los individuos, por cada individuo mira 
//para obtener los ids de los machos usa dameIndividuosEspecieSexoBBDD con M, y recorre esos ids
//-usando la funcion dameTableroActualizadoUsuario recoge 
//-las respuestas de los machos: semillas y movimientos
//-dameTableroActualizadoUsuario devuelve el tablero con estas respuestas actualizadas
//guarda el tablero (con los movs y semillas) en BBDD con actualizaTableroPasoBBDD
//envia pagina a la simulacion, para que el usuario espere a que los demas hayan terminado esta fase
//actualizaListaEspecies
var decisionMachos = module.exports.decisionMachos = async function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;	
	var paso = peticion.session.paso;
	var fase = peticion.session.fase;
	//solo si la simulacion esta en la fase 1 que la de machos, la sesion del jugador esta tambien en fase 1
	//y el paso del jugador es el de la simulacion
	const faseSim = await fbd.dameFaseSimulacionBBDD(idSimulacion,idUsuario).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	const pasoSim = await fbd.damePasoSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	if(fase==1 && faseSim==1 && pasoSim==paso){
		//encapsulamos todos los parametros en un solo objeto porque se usa map despues con dameTableroPasoBBDD
		var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
		//recoge la lista de machos y el tablero de este paso
		const [indivsEspec, tablero] = await Promise.all(
			[fbd.dameIndividuosEspecieSexoBBDD(idSimulacion,idUsuario,"M"),
				fbd.dameTableroPasoBBDD(paramMap)]).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		//guarda las decisiones de los machos en el tablero del paso actual
		funcionesExtra.dameTableroActualizadoUsuario(peticion,indivsEspec,tablero,"s");	
		var tableroString = JSON.stringify(tablero);			
		const resultados = await fbd.actualizaTableroPasoBBDD(respuesta,idSimulacion,idUsuario,paso,tableroString);		
		//este usuario esta preparado a que el servidor ejecute el siguiente paso
		const res2 = await fbd.marcarPreparadoONoBBDD(idUsuario,1).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		respuesta.redirect("/actualizaListaEspecies");//manda al usuario a esperar a que los demas terminen	
	}
	else{
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err}));
	}
}

//coge el tablero del paso actual, extrae la lista de los individuos, por cada individuo mira 
//para obtener los ids de las hembras usa dameIndividuosEspecieSexoBBDD con H, y recorre esos ids
//-usando la funcion dameTableroActualizadoUsuario recoge 
//-las respuestas de las hembras: decisiones y movimientos
//-dameTableroActualizadoUsuario tb actualiza la info de los individuos del tablero, sus respuestas
//actualiza los codigos con los codigos de la evolucion de este paso
//recoge los codigos del paso anterior para enviar pagina de toma de decisiones a los machos
//envia pagina de toma de decisiones de los machos
var decisionHembras = module.exports.decisionHembras = async function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;	
	var paso = peticion.session.paso;
	var fase = peticion.session.fase;
	//solo si la simulacion esta en la fase 0 que la de hembras, la sesion del jugador esta tambien en fase 0
	//y el paso del jugador es el de la simulacion
	const faseSim = await fbd.dameFaseSimulacionBBDD(idSimulacion,idUsuario).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	const pasoSim = await fbd.damePasoSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	if(fase==0 && faseSim==0 && pasoSim==paso){			
		//encapsulamos todos los parametros en un solo objeto porque se usa map despues con dameTableroPasoBBDD
		var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
		const [indivsEspec, tablero] = await Promise.all(
			[fbd.dameIndividuosEspecieSexoBBDD(idSimulacion,idUsuario,"H"),
				fbd.dameTableroPasoBBDD(paramMap)]).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		
		funcionesExtra.dameTableroActualizadoUsuario(peticion,indivsEspec,tablero,"d");
		var tableroString = JSON.stringify(tablero);					
		fbd.actualizaTableroPasoBBDD(idSimulacion, idUsuario, paso, tableroString);
		var nuevosCodigosEspecie=[];
		nuevosCodigosEspecie.push(peticion.body.nameCodigoMacho);
		nuevosCodigosEspecie.push(peticion.body.nameCodigoHembra);
		var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
		//coge los codigos del paso anterior, evolucionan los codigos del paso actual y  despues envia tablero y codigos paso anterior a los machos
		const [codigos, res2] = await Promise.all(
			[fbd.dameCodigosPasoBBDD(paramMap),
				fbd.actualizaCodigosPasoBBDD(idSimulacion, idUsuario, paso, nuevosCodigosEspecie)]).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		peticion.session.fase = 1;
		fase=1;						
		const indivEspSex = await fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M").catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		fr.enviaTableroMachos(respuesta,idSimulacion,idUsuario,tablero, codigos,indivEspSex);
	}		
	else{
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err}));
	}
}

var actualizaListaEspecies = module.exports.actualizaListaEspecies = async function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;
	var paso = peticion.session.paso;
	//mira si empieza/continua la simulacion
	//si empieza/continua, recoge codigos especie, ejecuta el paso anterior y enviaSemillasHembras y sino pide la lista de especies de nuevo
	const estanListos = await fbd.miraSiListosSigPasoBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	const pasoSim = await fbd.damePasoSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	//si estan todos listos o ya se les puso como no preparados y se incremento el paso
	//entonces ejecuta el paso o enviasemillashembras, respestivamente
	if(!seguroSemaforo && (estanListos || (pasoSim==paso+1))){
		//si el paso de la sim es el paso de sim que tiene este usuario en su sesion
		//entonces estan todos listos asi que ejecuta el paso
		if(!seguroSemaforo && pasoSim==paso){
			seguroSemaforo=true;
			//ejecuta el paso anterior(todas las decisiones recien enviadas) 
			const listaEspec = await fbd.dameListaEspeciesSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
			const res2 = await fbd.ejecutaPaso(respuesta,idSimulacion,paso);
			seguroSemaforo=false;
			funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:listaEspec}) );
		}
		//si el paso de la simulacion ha incrementado y el paso que tiene en sesion este usuario no
		//entonces incrementarlo y enviarle semillas a sus hembras para que decidan, fase0
		else{
			var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};	
			const codPaso = await fbd.dameCodigosPasoBBDD(paramMap).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));	
			const indivEspSex = await fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H").catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
			peticion.session.fase = 0;
			peticion.session.paso = paso+1;							
			fr.enviaSemillasHembras(respuesta, idSimulacion, idUsuario, codPaso, indivEspSex);
		}			
	}
	//si todavia no estan todos listos ni se ha incrementado el paso de la simu, seguir esperando
	else{
		//pide la lista de especies de la simulacion y la muestra
		const listaEspec = await fbd.dameListaEspeciesSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
		funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:listaEspec}) );
	}
}

var marcarPreparado = module.exports.marcarPreparado = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;
	fbd.marcarPreparadoONoBBDD(idUsuario,1).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
}

var entrarSimulacion = module.exports.entrarSimulacion = async function(peticion,respuesta){
	var cadenaIdSimulacion = peticion.body.namePulsado;
	peticion.session.idSimulacion = parseInt(cadenaIdSimulacion);
	peticion.session.paso=-1;
	peticion.session.fase=0;
	var idSimulacion = peticion.session.idSimulacion;
	var idUsuario = peticion.session.idUsuario;
	const pasoIni = await creaPasoInicial(respuesta,idSimulacion,idUsuario,-1);
	const listaEspec = await fbd.dameListaEspeciesSimulacionBBDD(idSimulacion).catch(muestraErrorCuenta(error).bind({respuesta: respuesta}));
	funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:listaEspec}) );
}

var listarSimulaciones = module.exports.listarSimulaciones = function(peticion,respuesta){		
	fbd.dameListaSimulacionesActivasBBDD(respuesta);
}

var subirCodigos = module.exports.subirCodigos = async function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var machoCodigo=peticion.body.machoCodigo;
	var hembraCodigo=peticion.body.hembraCodigo;
	const codsUsu = await fbd.subeCodigosUsuarioBBDD(idUsuario,machoCodigo,hembraCodigo);
	funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta,  mensaje:codsUsu}));
	// console.log("machoCodigo");
	// console.log(machoCodigo);
	// console.log("hembraCodigo");
    // console.log(hembraCodigo);
}

var menuCuenta = module.exports.menuCuenta = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta}));
}

var editarCodigos = module.exports.editarCodigos = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	respuesta.sendFile(__dirname+"\\editorCodigos.html");
}

var datosUsuario = module.exports.datosUsuario = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	fbd.dameDatosUsuarioBBDD(respuesta, idUsuario);
}

//elimina la sesion
var salirCuenta = module.exports.salirCuenta = function(peticion,respuesta){
	peticion.session.destroy(function(error1) {
		if(error1) {
		 	console.log(error1);
		} else {
			respuesta.redirect('/');
		}
	});
}

var cargarLogin = module.exports.cargarLogin = function(peticion,respuesta){
	console.log("cargando login");
	funcionesArchivos.leeArchivo(__dirname + "\\botones.html",fr.enviaMensaje.bind({respuesta: respuesta, mensaje:""}));
}

//la funcion instanciaExpress.get o post devuelve los objetos peticion de la clase Request y respuesta de la clase Response
//lee la cabecera con la contraseña y el mail introducidos por el usuario en botones.html, ambos codificados en base64
var leerDatosLogin = module.exports.leerDatosLogin = function(peticion,respuesta){
	var nombre = "John";
	var contrasegna = "Doe";
	console.log("atiende autentifica");	
	var cabecera=peticion.body.authorization||'';       // cogemos objeto cabecera de peticion
	console.log(cabecera);
    var sinEspacios=cabecera.split("\\s+").pop()||'';           // quitamos los espacios
    var autorizacion=new Buffer(sinEspacios, "base64").toString();    // lo convertimos a bas64
    var partes=autorizacion.split(/:/);                          // partimos en el separador :
      nombre=partes[0];
	  contrasegna=partes[1];
	var sesionPeticion=peticion.session;
	sesionPeticion.nombreUsuario = nombre;//guarda nombre del usuario en sesion
	console.log(nombre+":"+contrasegna);
	fbd.autentificaBBDD(peticion, respuesta, nombre, contrasegna);
	//seguramente se llegue aqui sin tener la respuesta de la consulta sql		
}
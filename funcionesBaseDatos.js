var funcionesExtra = require( __dirname + '/funcionesExtra.js');
var funcionesArchivos = require( __dirname + '/funcionesArchivos.js');
var fr = require( __dirname + '/funcionesResponder.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

//Esta funcion decide si la contraseña y el usuario son correctos
//accede a la base de datos guardada en el archivo "miBaseDatos.db"
//compara el usuario con los de la consulta y sino lo casa dice que no existe
//si lo casa compara la contraseña introducida con la de ese registro de la base de datos(el registro casado)
var autentificaBBDD = module.exports.autentificaBBDD = function(peticion, respuesta, nombre, contrasegna) {
	var resultadoLogin = "";	
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT id, nombre, contrasegna FROM USUARIO WHERE nombre=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [nombre], function(err, rows) {
			console.log(rows[0].nombre + ": " + rows[0].contrasegna);
			if(rows.length>0){//mientras no encuentre al usuario introducido sigue buscando
				if(rows[0].nombre==nombre){
					if(rows[0].contrasegna==contrasegna){//si caso el usuario se comprueba la contrseña
						resultadoLogin="contraseña correcta";
						peticion.session.idUsuario = rows[0].id;
                        var mensaje=rows[0].nombre;
                        funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:resultadoLogin}));
					}
					else{
                        resultadoLogin="contraseña incorrecta";
                        funcionesArchivos.leeArchivo(__dirname + "\\botones.html",fr.enviaMensaje.bind({respuesta: respuesta, mensaje:resultadoLogin}));
					}
				}
			}	
			else{
                resultadoLogin = "no existe ese usuario";
                funcionesArchivos.leeArchivo(__dirname + "\\botones.html",fr.enviaMensaje.bind({respuesta: respuesta, mensaje:resultadoLogin}));
				console.log(resultadoLogin);
			}					
			console.log(resultadoLogin);	
			baseDatos.close();		
		});	
	});
	if(baseDatos==null){
        resultadoLogin = "error al conectar con BBDD";
        funcionesArchivos.leeArchivo(__dirname + "\\botones.html",fr.enviaMensaje.bind({respuesta: respuesta, mensaje:resultadoLogin}));
		console.log(resultadoLogin);
	}	
}

var subeCodigosUsuarioBBDD = module.exports.subeCodigosUsuarioBBDD = function(respuesta, idUsuario, machoCodigo,hembraCodigo,retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT * FROM CODIGOS_ESPECIE WHERE ID_ESPECIE=?";
	var insertSQL = "INSERT INTO CODIGOS_ESPECIE (ID_ESPECIE, CODIGO_MACHO, CODIGO_HEMBRA) VALUES (?, ?, ?)";
	var updateSQL = "UPDATE CODIGOS_ESPECIE SET CODIGO_MACHO=?, CODIGO_HEMBRA=? WHERE ID_ESPECIE = ?";
	console.log(consultaSQL);
    var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	var error = null;//"error al subir los codigos";
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL,[idUsuario], function(err, rows) {
			if(err){
				error = new Error("subeCodigosUsuarioBBDD: "+errr);
			}
			else{
				if(rows.length>0){
					baseDatos.run(updateSQL,[machoCodigo,hembraCodigo,idUsuario]);
				}
				else{
					baseDatos.run(insertSQL,[idUsuario,machoCodigo,hembraCodigo]);
				}
			}						
			retrollamada(error,"datos subidos con exito");
			baseDatos.close();
		});	
	});
	if(baseDatos==null){
        error = new Error("error al conectar con BBDD");
		retrollamada(error);
	}	
}

var dameDatosUsuarioBBDD = module.exports.dameDatosUsuarioBBDD = function(respuesta, idUsuario){
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT nombre, contrasegna, CODIGO_MACHO, CODIGO_HEMBRA FROM USUARIO INNER JOIN CODIGOS_ESPECIE ON id=ID_ESPECIE WHERE id=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [idUsuario], function(err1, rows) {
			if(err1){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
			}
			else{
				var nom = "";var con = "";var codM = "";var codH = "";			
				if(rows.length>0){
					nom = rows[0].nombre;
					con = rows[0].contrasegna;
					codM = rows[0].CODIGO_MACHO;
					codH = rows[0].CODIGO_HEMBRA;
				}
                console.log(nom + ": " + con);
                funcionesArchivos.leeArchivo(__dirname + "\\datos.html", fr.enviaDatos.bind({respuesta: respuesta, nom:nom, con:con, codM:codM, codH:codH}));
			}		
			baseDatos.close();	
		});	
	});
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}	
}

function leeRetrollamada(err2,html_cadena) {
	if (err2) {
		console.log(err2);
	}
	return html_cadena;
}

var dameListaSimulacionesActivasBBDD = module.exports.dameListaSimulacionesActivasBBDD = function(respuesta){
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT ID_SIMULACION FROM SIMULACION WHERE NUMERO_ESPECIES<MAX_NUM_ESPECIES";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, function(err1, rows) {
			if(err1){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
			}
			else{
				var iniCadenaHTML = "<html><head></head><body>";
				var finCadenaHTML = "</body></html>";
				
				ClaseAsync.parallel([
					// esto se ejecuta en paralelo porque no depende de ningun otro proceso
					function(leeRetrollamada) {
                        funcionesArchivos.leeArchivo(__dirname + "\\iniListaSimulaciones.txt", leeRetrollamada);
					},
					//esto se ejecuta en paralelo tambien
					function(leeRetrollamada) {
                        funcionesArchivos.leeArchivo(__dirname + "\\finListaSimulaciones.txt", leeRetrollamada);
					}
					],
					fr.enviaListaSimulaciones.bind({respuesta: respuesta, rows:rows})
                );//fin del paralelismo  			
                //el bind aniade parametros a la funcion retrollamada, en este caso enviaListaSimulaciones tendra respuesta y 
                //rows como parametros extra para poder responder al cliente. para acceder dentro de la funcion se usa this, ejemplo: this.rows
			}
			baseDatos.close();
		});
	});	
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}	
}

var creaPasoUsuarioBBDD = module.exports.creaPasoUsuarioBBDD = function(paramMap, retrollamada){
	var respuesta = paramMap.res;
	var idSimulacion = paramMap.idSim;
	var paso = paramMap.paso;
	var idUsuario = paramMap.idUsu;
	var tableroString = paramMap.tab;
	var codM = paramMap.codM;
	var codH = paramMap.codH;
	var sqlite3 = require("sqlite3").verbose();
	if(codM==null)codM="";
	if(codH==null)codH="";
	var insertSQL = "INSERT OR IGNORE INTO PASO_SIMULACION (ID_SIMULACION, PASO, ID_ESPECIE, TABLERO, HECHA_DECISION_HEMBRAS, CODIGO_MACHO, CODIGO_HEMBRA) VALUES (?, ?, ?, ?, ?, ?, ?)";
	console.log(insertSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.run(insertSQL,[idSimulacion,paso,idUsuario,tableroString,0,codM,codH], function(err1, rows) {
		if(err1){
			funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
		}
		retrollamada();	
		baseDatos.close();	
	});
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}	
}

//consigue la lista de jugadores de la simulacion
var dameListaEspeciesSimulacionBBDD = module.exports.dameListaEspeciesSimulacionBBDD = function(idSimulacion, retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT DISTINCT(ID_ESPECIE), nombre, PREPARADO ";
	consultaSQL +="FROM PASO_SIMULACION ";
	consultaSQL +="INNER JOIN USUARIO ON ID_ESPECIE=id ";	
	//consultaSQL +="INNER JOIN SIMULACION ON ";
	//consultaSQL +="(SIMULACION.ID_SIMULACION = PASO_SIMULACION.ID_SIMULACION ";
	//consultaSQL +="AND SIMULACION.PASO = PASO_SIMULACION.PASO) ";
	consultaSQL +="WHERE PASO_SIMULACION.ID_SIMULACION=?";
	var baseDatos = new sqlite3.Database("miBaseDatos.db");		
	console.log(consultaSQL);
	baseDatos.all(consultaSQL,[idSimulacion], function(err1, rows) {
		var listaEspecies = [];
		var error = null;
		if(err1){
			error=new Error("dameListaEspeciesSimulacionBBDD: "+err1);
		}
		else{
			if(rows.length>0){
				listaEspecies = rows;				                    
			}	
			else{
				error=new Error("error lista jugadores");				
			}				
		}
		retrollamada(error,listaEspecies);
		baseDatos.close();
	});
	if(baseDatos==null){
		retrollamada(new Error("error al conectar con BBDD"));
	}
}

var marcarPreparadoONoBBDD = module.exports.marcarPreparadoONoBBDD = function(respuesta, idUsuario, preparado, retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE USUARIO SET PREPARADO=? WHERE id=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.run(updateSQL, [preparado,idUsuario], function(err1, rows) {
			if(err1){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
				return false;
			}
			else{
				return true;
			}				
			baseDatos.close();		
		});	
	});
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}	
}

var miraSiListosSigPasoBBDD = module.exports.miraSiListosSigPasoBBDD = function(idSimulacion,retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT MAX_NUM_ESPECIES ";
	consultaSQL +="FROM PASO_SIMULACION ";
	consultaSQL +="INNER JOIN USUARIO ON ID_ESPECIE=id ";
	consultaSQL +="INNER JOIN SIMULACION ON ";
		consultaSQL +="(SIMULACION.ID_SIMULACION=PASO_SIMULACION.ID_SIMULACION ";
		consultaSQL +="AND SIMULACION.PASO=PASO_SIMULACION.PASO)";
	consultaSQL +="WHERE SIMULACION.ID_SIMULACION=? AND PREPARADO=1";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [idSimulacion], function(err1, rows) {
			var empieza = false;
			if(err1){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
			}
			else{
				if(rows.length>0 && rows.length==rows[0].MAX_NUM_ESPECIES){
					empieza=true;
				}
			}			
			retrollamada(null,empieza);	
			baseDatos.close();		
		});	
	});
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}	
}

var dameCodigosEspecieBBDD = module.exports.dameCodigosEspecieBBDD = function(idUsuario,retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT CODIGO_MACHO, CODIGO_HEMBRA FROM CODIGOS_ESPECIE WHERE ID_ESPECIE=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idUsuario], function(err1, rows) {
			var listaCodigosEspecie=[];
			if(err1){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
			}
			else{
				if(rows.length==1){					
					listaCodigosEspecie[0]=rows[0].CODIGO_MACHO;
					listaCodigosEspecie[1]=rows[0].CODIGO_HEMBRA;
				}
			}		
			retrollamada(null, listaCodigosEspecie);	
			baseDatos.close();		
		});	
	});
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}	
}

var dameIndividuosEspecieSexoBBDD = module.exports.dameIndividuosEspecieSexoBBDD = function(idSimulacion, idUsuario, sexo, retrollamada){
	var indivaux=[];
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT TABLERO";
	consultaSQL+=" FROM PASO_SIMULACION";
	consultaSQL+=" INNER JOIN SIMULACION ON";
		consultaSQL+=" (SIMULACION.ID_SIMULACION = PASO_SIMULACION.ID_SIMULACION";
		consultaSQL+=" AND SIMULACION.PASO = PASO_SIMULACION.PASO)";
	consultaSQL+=" WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion, idUsuario], function(err1, rows) {			
			if(err1){
				retrollamada(new Error("dameIndividuosEspecieSexoBBDD: "+err1),indivaux);
			}
			else{
				if(rows.length==1){
					var tablero = JSON.parse(rows[0].TABLERO);
					var individuos = tablero.individuos;
					var i;
					var j=0;
					for(i=0;i<individuos.length;i++){
						var individuo=individuos[i];
						if(individuo.sexo==sexo && individuo.especie==idUsuario){
							indivaux[j]=individuo;
							j++;
						}
					}					
				}
			}	
			baseDatos.close();
			retrollamada(null,indivaux);								
		});	
	});
	if(baseDatos==null){
		retrollamada(new Error("error al conectar con BBDD"),indivaux);
	}	
}

var actualizaCodigosPasoBBDD = module.exports.actualizaCodigosPasoBBDD = function(idSimulacion, idUsuario, paso, nuevosCodigosEspecie, retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE PASO_SIMULACION SET CODIGO_MACHO=?, CODIGO_HEMBRA=? WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(updateSQL, [nuevosCodigosEspecie[0],nuevosCodigosEspecie[1],idSimulacion, idUsuario, paso], function(err1, rows) {
			if(err1){
				retrollamada(new Error("actualizaCodigosPasoBBDD: "+err1),false);
			}
			else{
				retrollamada(null,true);
			}
			baseDatos.close();
		});	
	});
	if(baseDatos==null){		
		retrollamada(new Error("error al conectar con BBDD"),false);
	}	
}

var actualizaTableroPasoBBDD = module.exports.actualizaTableroPasoBBDD = function(respuesta,idSimulacion, idUsuario, paso, tablero,retrollamada){
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE PASO_SIMULACION SET TABLERO=?, HECHA_DECISION_HEMBRAS=? WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
			baseDatos.run(updateSQL, [tablero, 1, idSimulacion, idUsuario, paso],function(err,res){
				retrollamada(err);
			});
	});
	baseDatos.close();
}

var dameTableroPasoBBDD = module.exports.dameTableroPasoBBDD = function(paramMap, retrollamada){
	var idSimulacion = paramMap.idSimulacion;
	var idUsuario = paramMap.idUsuario;
	var paso = paramMap.paso;
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT TABLERO FROM PASO_SIMULACION WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion, idUsuario, paso], function(err1, rows) {
			var tabaux = {};
			if(err1){
				retrollamada(err1,{});
			}
			else{
				if(rows.length==1){
					tabaux = JSON.parse(rows[0].TABLERO);
				}
			}
			baseDatos.close();
			retrollamada(null,tabaux);			
		});	
	});
	if(baseDatos==null){
		retrollamada(new Error("error al conectar con BBDD"),{});
	}
}

var dameCodigosPasoBBDD = module.exports.dameCodigosPasoBBDD = function(paramMap,retrollamada){
	var idSimulacion = paramMap.idSimulacion;
	var idUsuario = paramMap.idUsuario;
	var paso = paramMap.paso;
	var codMach=null;
	var codHemb=null;	
	var listaCodigos=[codMach,codHemb];
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT CODIGO_MACHO, CODIGO_HEMBRA FROM PASO_SIMULACION WHERE ID_SIMULACION=? AND ID_ESPECIE=? AND PASO=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion, idUsuario, paso], function(err1, rows) {			
			if(err1){
				retrollamada(new Error("dameCodigosPasoBBDD: "+err1),listaCodigos);
			}
			else{
				if(rows.length==1){
					codMach = rows[0].CODIGO_MACHO;
					codHemb = rows[0].CODIGO_HEMBRA;
				}
			}
			listaCodigos[0]=codMach;
			listaCodigos[1]=codHemb;
			baseDatos.close();
			retrollamada(null,listaCodigos);			
		});	
	});
	if(baseDatos==null){
		retrollamada(new Error("error al conectar con BBDD"),listaCodigos);
	}
}

var dameFaseSimulacionBBDD = module.exports.dameFaseSimulacionBBDD = function(idSimulacion,idUsuario,retrollamada){
	var fase=-1;	
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT HECHA_DECISION_HEMBRAS ";
	consultaSQL += "FROM PASO_SIMULACION ";
	consultaSQL += "INNER JOIN SIMULACION ON (SIMULACION.ID_SIMULACION=PASO_SIMULACION.ID_SIMULACION ";
		consultaSQL += "AND SIMULACION.PASO=PASO_SIMULACION.PASO) ";
	consultaSQL += "WHERE PASO_SIMULACION.ID_SIMULACION=? ";
		consultaSQL += "AND PASO_SIMULACION.ID_ESPECIE=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion,idUsuario], function(err1, rows) {
			if(err1){
				retrollamada(err1);
			}
			else{
				if(rows.length==1){
					fase = rows[0].HECHA_DECISION_HEMBRAS;
				}
			}
			retrollamada(null,fase);
			baseDatos.close();
		});	
	});
	if(baseDatos==null){
		retrollamada(new Error("error al conectar con BBDD"));
	}
}

var damePasoSimulacionBBDD = module.exports.damePasoSimulacionBBDD = function(idSimulacion,retrollamada){
	var paso=-1;	
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT PASO FROM SIMULACION WHERE SIMULACION.ID_SIMULACION=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion], function(err1, rows) {
			if(err1){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err1}));
			}
			else{
				if(rows.length==1){
					paso = rows[0].PASO;
				}
			}
			retrollamada(null,paso);
			baseDatos.close();
		});	
	});
	if(baseDatos==null){
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:"error al conectar con BBDD"}));
	}
}

var dameFecundacionesSimulacionBBDD = module.exports.dameFecundacionesSimulacionBBDD = function(idSimulacion,retrollamada){
	var listaFecundaciones = [];	
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT ID_MADRE, ID_ESPECIE_PADRE FROM FECUNDACION WHERE ID_SIMULACION=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	var error = null;
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion], function(err1, rows) {
			if(err1){
				error = new Error("dameFecundacionesSimulacionBBDD: "+err1);
			}
			else{
				if(rows.length>0){
					rows.forEach(function(row) {
						var fecundacion = {"idmadre":row.ID_MADRE,"especiepadre":row.ID_ESPECIE_PADRE};
						listaFecundaciones.push(fecundacion);
					}, this);
				}
			}
			retrollamada(error,listaFecundaciones);
			baseDatos.close();
		});	
	});
	if(baseDatos==null){
		retrollamada(new Error("error al conectar con BBDD"),listaFecundaciones);
	}
}

var actualizaFecundacionSimulacionBBDD = module.exports.actualizaFecundacionSimulacionBBDD = function(idSimulacion,fecundacion){
	var sqlite3 = require("sqlite3").verbose();
	var replaceSQL = "INSERT OR REPLACE INTO FECUNDACION (ID_SIMULACION,ID_MADRE,ID_ESPECIE_PADRE) VALUES (?,?,?)";
	console.log(replaceSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.run(replaceSQL, [idSimulacion,fecundacion.idmadre,fecundacion.especiepadre]);	
	});
}

// var ponFaseSimulacionBBDD = module.exports.ponFaseSimulacionBBDD = function(idSimulacion,fase,retrollamada){
// 	var sqlite3 = require("sqlite3").verbose();
// 	var updateSQL = "UPDATE SIMULACION SET FASE=? WHERE ID_SIMULACION=?";
// 	console.log(updateSQL);
// 	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
// 	baseDatos.serialize(function() {
// 		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
// 		baseDatos.run(updateSQL, [fase,idSimulacion], function(err1, rows) {
// 			retrollamada(err1);
// 			baseDatos.close();		
// 		});	
// 	});
// }

var incrementaPasoSimulacionBBDD = module.exports.incrementaPasoSimulacionBBDD = function(idSimulacion){
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE SIMULACION SET PASO=PASO+1 WHERE ID_SIMULACION=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.run(updateSQL, [idSimulacion], function(err1, rows) {
			baseDatos.close();		
		});	
	});
}
var ClaseFs = require("fs");//para leer archivos del sistema

var leeArchivo = module.exports.leeArchivo  = function(ruta, retrollamada){
    ClaseFs.readFile(ruta, 'utf8', retrollamada);
}

var leeArchivoAsync = module.exports.leeArchivoAsync  = async function(ruta){
	return new Promise(function (resolve, reject) {
		ClaseFs.readFile(ruta, function (error, result) {
		  if (error) {
				reject(error);
		  } else {
				resolve(result);
		  }
		});
	});
}
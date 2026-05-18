import mysql from 'mysql2';

// Crea una pool de conexiones en lugar de una conexión única
const dbConnect = mysql.createPool({
    host: process.env.HOST,  
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true, // Espera conexiones si todas están ocupadas
    connectionLimit: 10, // Límite máximo de conexiones en el pool
    queueLimit: 0 // Sin límite en la cola de conexiones
});

// Exporta una función para obtener una conexión del pool
const getConnection = () => {
    return new Promise((resolve, reject) => {
        dbConnect.getConnection((err, connection) => {
            if (err) {
                console.log('Error en conexion a DB: ' + err);
                reject(err);
            } else {
               /*  console.log('conectado a la DB: ' ) */;
                resolve(connection);
                
            }
        });
    });
};

// Exporta la función de getConnection y el pool de conexiones
export { dbConnect, getConnection };

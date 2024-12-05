<?php
$host = "localhost";
$user = "root";
$password = "";
$dbname = "dbhpc";

$conexion = new mysqli($host, $user, $password, $dbname);

if(isset($_POST['Enviar'])){

    $nombre = $_POST ['Nombre'];
    $correo = $_POST ['Correo'];
    $telefono = $_POST ['Telefono'];
    $mensaje = $_POST ['Mensaje'];

    $insertardatos = "INSERT INTO usuarios VALUES('$nombre', '$correo', '$telefono', '$mensaje')";

    $ejecutar = mysqli_query($conexion, $insertardatos);
    echo ("<h1>Datos enviados correctamente</h1>");
}
?>
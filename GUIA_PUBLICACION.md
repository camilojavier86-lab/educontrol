# Publicar EduControl en GitHub Pages

## Primera publicación

1. Entre a GitHub y cree un repositorio nuevo llamado `educontrol`.
2. Elija repositorio **Public** y pulse **Create repository**.
3. Descomprima `EduControl_v1.1_actualizacion.zip` en su computadora.
4. En la página del repositorio, pulse **Add file** → **Upload files**.
5. Arrastre todos los archivos descomprimidos. Deben quedar directamente en la raíz, no dentro de otra carpeta.
6. Pulse **Commit changes**.
7. Abra **Settings** → **Pages**.
8. En **Build and deployment**, elija **Deploy from a branch**.
9. Seleccione la rama **main** y la carpeta **/(root)**. Pulse **Save**.
10. Espere uno o dos minutos. La dirección será parecida a:

   `https://SU_USUARIO.github.io/educontrol/`

## Instalar en Android

1. Abra la dirección publicada con Chrome.
2. Abra el menú de tres puntos.
3. Elija **Instalar aplicación** o **Agregar a pantalla principal**.

La opción puede tardar unos segundos en aparecer durante la primera visita.

## Actualizaciones futuras

1. Use solamente el ZIP de actualización de la versión nueva.
2. Suba sus archivos a la raíz del mismo repositorio y confirme que desea reemplazarlos.
3. No borre el almacenamiento del navegador y no use Restablecer datos de demostración.
4. Abra EduControl y recargue la página. Si el navegador conserva una versión visual anterior, cierre la PWA y ábrala nuevamente.

La clave `educontrol_v1` permanece estable. Las futuras versiones deberán incluir migraciones cuando cambie la estructura de datos.

## Respaldo de datos creados durante la prueba

Antes de una actualización importante:

1. Entre como Administrador.
2. Abra **Configuración**.
3. Pulse **Descargar respaldo JSON**.

Ese archivo permite recuperar los datos desde **Importar respaldo JSON** en el mismo módulo.

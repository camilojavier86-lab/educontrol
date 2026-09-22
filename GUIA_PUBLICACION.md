# Publicar EduControl v1.2.0 en GitHub Pages

## Si ya tiene v1.1 publicada

1. Descargue `EduControl_v1.2_actualizacion.zip`.
2. Descomprímalo.
3. Abra el repositorio `educontrol` en GitHub.
4. Entre en **Code / Código**.
5. Use **Add file / Agregar archivo → Upload files / Cargar archivos**.
6. Suba directamente los archivos extraídos a la raíz del repositorio.
7. Confirme con **Commit changes / Confirmar cambios**.
8. Espere uno o dos minutos y abra la dirección de GitHub Pages.

Los archivos deben quedar en la raíz; no suba la carpeta `EduControl_v1.2` completa como una subcarpeta.

## Si el teléfono sigue mostrando v1.1

1. Abra la página.
2. Recargue una vez.
3. Si sigue igual, cierre la pestaña y vuelva a abrirla.
4. Como último paso, borre únicamente la caché del sitio; no borre los datos del sitio si quiere conservar sus pruebas.

El nuevo service worker elimina la caché v1.1 y usa `educontrol-shell-v1.2.0`. La base local conserva la clave `educontrol_v1` y se migra sin restablecerla.

## Publicación nueva

1. Cree un repositorio público llamado `educontrol`.
2. Cargue el contenido de `EduControl_v1.2_respaldo_completo.zip` en la raíz.
3. Abra **Settings / Configuración → Pages / Páginas**.
4. En **Build and deployment / Compilación e implementación**, elija **Deploy from a branch / Implementar desde una rama**.
5. Seleccione `main` y `/ (root)`; guarde.
6. Abra `https://<usuario>.github.io/educontrol/` cuando GitHub indique que la publicación terminó.

## Instalar en Android

Abra la dirección publicada en Chrome y use **Agregar a pantalla principal** o **Instalar aplicación**, según la opción que muestre el navegador.


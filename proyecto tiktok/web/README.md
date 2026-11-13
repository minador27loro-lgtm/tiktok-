# TikTok Studio · @cea.crime.eee

Panel web **local** para ver los datos de una cuenta de TikTok escribiendo solo su nombre.
Sin registro, sin Login Kit y sin tokens.

- **Resumen**: seguidores, me gusta totales, nº de vídeos, views totales, media por vídeo, ER, mejor día para publicar, top 5 y rendimiento por formato.
- **Cuentas**: añade todas tus cuentas por nombre y cambia entre ellas con un clic. Guarda un histórico diario de seguidores.
- **Vídeos**: tabla ordenable con views, me gusta, comentarios, compartidos, guardados y ER. Puedes etiquetar el formato y dejar notas.
- **Competencia**: escribe el nombre de otra cuenta y la compara contigo (seguidores, media de views, ER y sus últimos vídeos).
- **Estrategia**: radiografía de cada cuenta, ideas de contenido para su audiencia, frases de looksmaxxing para `.mogger077` y plan de crecimiento. Se actualiza sola cada 10 minutos.
- **Ideas**: 16 ideas con gancho, prioridad y estado.
- **Ajustes**: fuente de datos y exportación.

---

## 1. Arrancarla

Doble clic en **`iniciar.bat`** y abre:

```
http://localhost:3000
```

(La ventana negra debe quedarse abierta. Para parar, ciérrala o pulsa Ctrl+C.)

Para probar con datos inventados: **`demo.bat`**.

---

## 2. Ver tus datos

1. Abre la web.
2. Escribe tu cuenta: `cea.crime.eee` (o `@cea.crime.eee`).
3. Pulsa **Ver mis datos**.

En unos segundos verás tu perfil y tus últimos vídeos con sus estadísticas reales:
seguidores, me gusta, nº de vídeos, views, likes, comentarios, compartidos, guardados y ER.

No hay que crear ninguna app ni pegar claves.

### Varias cuentas tuyas

Pestaña **Cuentas** → escribe el nombre y **Añadir y seguir**. Puedes tener todas las que quieras
(por ejemplo `cea.crime.eee` y `.mogger077`). Con **Ver panel** cambias el panel a esa cuenta sin
volver a escribir nada. Cada vez que abras la web se guarda un punto de seguidores al día para ver
la evolución.

### Comparar con la competencia

Pestaña **Competencia** → escribe el nombre de otra cuenta → **Buscar y comparar**.
Trae sus seguidores y sus últimos vídeos, y calcula cuántas veces te supera.

### Estrategia y actualización

La pestaña **Estrategia** recopila los datos de todas tus cuentas: seguidores, medias, ER,
guardados, mejor día, mejores vídeos y hashtags. Incluye ideas de contenido según la audiencia,
frases de gancho de looksmaxxing para `.mogger077` y un plan de crecimiento por cuenta.

Se actualiza sola **cada 10 minutos** y cada vez que abres la web. También tiene botón
**Actualizar** y avisa cuando hay vídeos nuevos desde tu última visita.

---

## 3. Otros modos

- **Manual / CSV**: si quieres añadir vídeos antiguos o datos que no salen en público
  (retención, alcance), pulsa **Empezar en modo manual**. Puedes añadir vídeos uno a uno
  o importar el CSV de `tiktok.com/analytics`; detecta las columnas solo.
- **API de terceros (avanzado)**: dentro de *Conectar tu cuenta → Avanzado*. Con un token de
  Apify o EnsembleData se obtienen más vídeos por consulta. Requiere cuenta y suele tener coste.

---

## 4. Qué se puede ver y qué no

Datos **públicos** de la cuenta:

- Perfil: nombre, bio, seguidores, seguidos, me gusta totales, nº de vídeos.
- Últimos **11-12 vídeos**: portada, descripción, fecha, views, me gusta, comentarios,
  compartidos, guardados y ER.

Limitaciones reales:

- TikTok no permite leer el **historial completo** ni la **retención** o el **alcance** sin
  autorización de la cuenta. Aquí se ven los vídeos más recientes.
- Los datos pueden tardar unos segundos y TikTok puede cambiar su web o limitar las consultas.
- Es lectura de datos públicos: úsalo para análisis personal, no para reventa ni scraping masivo.

---

## 5. Privacidad

- Todo se guarda en **`web/.data/db.json`** en tu ordenador.
- Las peticiones salen a `tiktok.com` (datos públicos) y, si usas el modo avanzado, al proveedor del token.
- No se envía nada a ningún servidor mío.

---

## 6. Problemas frecuentes

| Problema | Solución |
|---|---|
| «No encuentro la cuenta» | Revisa el nombre, sin espacios. Debe ser público. |
| «Cuenta privada» | TikTok no muestra datos de cuentas privadas. |
| Tarda o falla | Vuelve a pulsar **Actualizar**; TikTok a veces limita las peticiones. |
| La web no abre | `iniciar.bat` debe estar abierto. Puerto 3000 libre. |
| Quiero más vídeos | Añádelos a mano en modo manual o usa el modo avanzado con token. |

---

## 7. Archivos

```
web/
├─ iniciar.bat        arranca la web
├─ demo.bat           arranca con datos de ejemplo
├─ server.mjs         servidor + lectura de datos públicos
├─ lib/public.mjs     perfil y vídeos públicos de TikTok
├─ lib/providers.mjs  conector opcional Apify / EnsembleData
├─ public/            interfaz (HTML, CSS, JS)
└─ .data/db.json      tus datos (se crea solo)
```

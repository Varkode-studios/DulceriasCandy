'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TiendaCandy() {
  const iniciado = useRef(false);
  const sincronizarRef = useRef(null);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    const supabase = createClient();

    const CONFIG = {
      whatsapp: '522214349590',
      costoEnvio: 59,
      piezasParaDescuento: 5,
      descuentoPorProducto: 0.05,
      porPagina: 24
    };

    const CATEGORIAS = [
      { id:'gomitas',    nombre:'Gomitas',    img:'img/Gomita.png',            color:'#EC008C' },
      { id:'chocolates', nombre:'Chocolates', img:'img/Chocolate.png',         color:'#8B5E3C' },
      { id:'caramelos',  nombre:'Caramelos',  img:'img/Caramelo.png',          color:'#F7941D' },
      { id:'paletas',    nombre:'Paletas',    img:'img/Paleta.png',            color:'#0085CA' },
      { id:'enchilados', nombre:'Enchilados', img:'img/Caramelo_enchilado.png',color:'#E63329' },
      { id:'fiesta',     nombre:'Fiesta',     img:'img/Fiesta.png',            color:'#00A650' }
    ];
    const colorCat = id => (CATEGORIAS.find(c=>c.id===id)||{}).color || 'var(--marca)';

    const RANGOS = [
      { id:'r1', nombre:'Hasta $50',    min:0,   max:50 },
      { id:'r2', nombre:'$50 a $100',   min:50,  max:100 },
      { id:'r3', nombre:'$100 a $200',  min:100, max:200 },
      { id:'r4', nombre:'Más de $200',  min:200, max:Infinity }
    ];

    const PRODUCTOS_BASE = [
      {id:'gom-01',nombre:'Ositos de goma frutales',marca:'Ricolino',unidad:'Bolsa 1 kg',precio:85,antes:99,cat:'gomitas',etiqueta:'top',piezas:200,stock:50,tope:20,desc:'Gomitas suaves de cinco sabores. Las que nunca fallan en una piñata ni en el mostrador.'},
      {id:'gom-02',nombre:'Gusanos ácidos surtidos',marca:'Ricolino',unidad:'Bolsa 500 g',precio:45,cat:'gomitas',piezas:70,stock:40,tope:20,desc:'Azúcar ácida por fuera, gomita por dentro. Favoritos de quienes ya se cansaron del dulce simple.'},
      {id:'gom-03',nombre:'Tiburones de goma',marca:'Ricolino',unidad:'Bolsa 1 kg',precio:85,cat:'gomitas',piezas:120,stock:30,tope:20,desc:'Clásico azul y blanco. Se venden solos en bolsitas de fiesta infantil.'},
      {id:'gom-04',nombre:'Aros de manzana verde',marca:'Ricolino',unidad:'Bolsa 500 g',precio:48,cat:'gomitas',piezas:90,stock:30,tope:20,desc:'Aros de gomita con azúcar. El que más rota de toda la línea.'},
      {id:'gom-05',nombre:'Gomitas de panditas',marca:'Ricolino',unidad:'Bolsa 1 kg',precio:88,cat:'gomitas',piezas:210,stock:40,tope:20,desc:'Los ositos de siempre, en presentación de kilo para fiesta.'},
      {id:'gom-06',nombre:'Bocaditos de fruta',marca:'La Perla',unidad:'Bolsa 500 g',precio:52,cat:'gomitas',etiqueta:'nuevo',piezas:80,stock:25,tope:20,desc:'Gomita con relleno suave de fruta. Presentación nueva en la casa.'},
      {id:'gom-07',nombre:'Lombrices de gomita',marca:'Ricolino',unidad:'Bolsa 1 kg',precio:82,antes:95,cat:'gomitas',piezas:130,stock:35,tope:20,desc:'Largas y de dos colores. Rinden mucho para bolsitas.'},
      {id:'gom-08',nombre:'Dientes y labios de goma',marca:'La Perla',unidad:'Bolsa 500 g',precio:49,cat:'gomitas',piezas:75,stock:20,tope:20,desc:'Formas divertidas, sabor frutal. Muy pedidas para fiestas temáticas.'},
      {id:'cho-01',nombre:'Trufas surtidas de chocolate',marca:'Ferrero',unidad:'Caja 500 g',precio:120,cat:'chocolates',piezas:40,stock:25,tope:20,desc:'Trufas en cuatro rellenos. Buena opción para mesa de dulces o regalo.'},
      {id:'cho-02',nombre:'Monedas de chocolate doradas',marca:"Hershey's",unidad:'Bolsa 50 piezas',precio:90,antes:105,cat:'chocolates',etiqueta:'top',piezas:50,stock:35,tope:20,desc:'Envueltas en dorado. Salen muchísimo en diciembre y en fiestas temáticas.'},
      {id:'cho-03',nombre:'Cacahuates cubiertos de chocolate',marca:'Ricolino',unidad:'Bolsa 500 g',precio:95,cat:'chocolates',piezas:150,stock:30,tope:20,desc:'Cacahuate tostado bañado en chocolate. Se vende por peso o ya en bolsita.'},
      {id:'cho-04',nombre:'Malvaviscos cubiertos',marca:'De la Rosa',unidad:'Bolsa 400 g',precio:78,cat:'chocolates',piezas:45,stock:25,tope:20,desc:'Malvavisco suave con capa de chocolate. Ideal para mesa de postres.'},
      {id:'cho-05',nombre:'Bombones de chocolate relleno',marca:'Ferrero',unidad:'Caja 24 piezas',precio:145,cat:'chocolates',piezas:24,stock:20,tope:20,desc:'Rellenos de avellana, fresa y caramelo. Presentación para regalo.'},
      {id:'cho-06',nombre:'Chocolate con arroz inflado',marca:"Hershey's",unidad:'Bolsa 500 g',precio:88,cat:'chocolates',piezas:60,stock:30,tope:20,desc:'Crujiente por dentro. De los que más gustan a los niños.'},
      {id:'cho-07',nombre:'Pasas cubiertas de chocolate',marca:'Ricolino',unidad:'Bolsa 500 g',precio:92,cat:'chocolates',etiqueta:'nuevo',piezas:180,stock:25,tope:20,desc:'Pasa entera con cobertura. Para quien busca algo menos empalagoso.'},
      {id:'cho-08',nombre:'Barras de chocolate de leche',marca:"Hershey's",unidad:'Caja 20 piezas',precio:130,antes:150,cat:'chocolates',piezas:20,stock:25,tope:20,desc:'Barras individuales para reventa o para llenar bolsitas grandes.'},
      {id:'car-01',nombre:'Dulces de leche quemada',marca:'La Poblana',unidad:'Bolsa 1 kg',precio:110,cat:'caramelos',piezas:90,stock:30,tope:20,desc:'Caramelo suave estilo tradicional. El sabor que reconoce cualquier abuelita.'},
      {id:'car-02',nombre:'Caramelos rellenos de fresa',marca:"Canel's",unidad:'Bolsa 1 kg',precio:105,cat:'caramelos',etiqueta:'top',piezas:160,stock:60,tope:20,desc:'Duro por fuera, relleno líquido de fresa. De los más pedidos por mayoreo.'},
      {id:'car-03',nombre:'Mazapán de cacahuate',marca:'De la Rosa',unidad:'Caja 30 piezas',precio:98,antes:112,cat:'caramelos',piezas:30,stock:45,tope:20,desc:'Mazapán clásico mexicano. Se deshace en la boca y se vende todo el año.'},
      {id:'car-04',nombre:'Bombones de menta envueltos',marca:"Canel's",unidad:'Bolsa 500 g',precio:52,cat:'caramelos',piezas:110,stock:30,tope:20,desc:'Menta suave envuelta individualmente. Los típicos para caja registradora.'},
      {id:'car-05',nombre:'Caramelo macizo surtido',marca:'La Perla',unidad:'Bolsa 1 kg',precio:78,cat:'caramelos',piezas:200,stock:40,tope:20,desc:'Sabores surtidos en envoltura de colores. El relleno más económico por pieza.'},
      {id:'car-06',nombre:'Obleas rellenas de cajeta',marca:'La Poblana',unidad:'Paquete 24 piezas',precio:96,cat:'caramelos',piezas:24,stock:25,tope:20,desc:'Oblea tradicional con cajeta de leche. Muy pedidas en escuelas.'},
      {id:'car-07',nombre:'Cocadas de coco',marca:'La Poblana',unidad:'Caja 20 piezas',precio:86,cat:'caramelos',piezas:20,stock:20,tope:20,desc:'Dulce tradicional de coco rallado. Se agota en temporada de feria.'},
      {id:'car-08',nombre:'Palanquetas de cacahuate',marca:'La Poblana',unidad:'Caja 25 piezas',precio:105,cat:'caramelos',etiqueta:'nuevo',piezas:25,stock:25,tope:20,desc:'Cacahuate con miel en barra. Clásico mexicano que nunca pasa de moda.'},
      {id:'pal-01',nombre:'Paletas espiral arcoíris',marca:'Chupa Chups',unidad:'Paquete 20 piezas',precio:65,antes:78,cat:'paletas',etiqueta:'top',piezas:20,stock:30,tope:20,desc:'Paletas grandes de colores. Además de dulce, funcionan como decoración de mesa.'},
      {id:'pal-02',nombre:'Paletas de caramelo macizo',marca:'Chupa Chups',unidad:'Bolsa 40 piezas',precio:58,cat:'paletas',piezas:40,stock:35,tope:20,desc:'Sabores surtidos, tamaño estándar. Las de siempre para bolsita de piñata.'},
      {id:'pal-03',nombre:'Paletas de bombón cubierto',marca:'Ricolino',unidad:'Paquete 12 piezas',precio:72,cat:'paletas',etiqueta:'nuevo',piezas:12,stock:20,tope:20,desc:'Bombón en palito con cobertura y chispas. Se ven muy bien en mesa de dulces.'},
      {id:'pal-04',nombre:'Paletas de payaso con chocolate',marca:'Ricolino',unidad:'Paquete 24 piezas',precio:88,cat:'paletas',piezas:24,stock:25,tope:20,desc:'Paleta de malvavisco con carita. Favorita para fiestas de niños chicos.'},
      {id:'pal-05',nombre:'Paletas de caramelo con chicle',marca:'De la Rosa',unidad:'Bolsa 40 piezas',precio:62,cat:'paletas',piezas:40,stock:30,tope:20,desc:'Paleta con centro de chicle. Dura el doble que una paleta normal.'},
      {id:'pal-06',nombre:'Paletas corazón de fresa',marca:'Vero',unidad:'Paquete 24 piezas',precio:70,cat:'paletas',piezas:24,stock:25,tope:20,desc:'Forma de corazón, sabor fresa. Se disparan en febrero.'},
      {id:'pal-07',nombre:'Paletas gigantes de colores',marca:'Chupa Chups',unidad:'Paquete 6 piezas',precio:96,cat:'paletas',piezas:6,stock:15,tope:20,desc:'Paletas de 15 cm. Más para decorar la mesa que para comer.'},
      {id:'enc-01',nombre:'Tamarindo enchilado',marca:'Vero',unidad:'Bolsa 500 g',precio:68,cat:'enchilados',piezas:50,stock:35,tope:20,desc:'Pulpa de tamarindo con chile. El equilibrio dulce, ácido y picoso de siempre.'},
      {id:'enc-02',nombre:'Gomitas enchiladas surtidas',marca:'Vero',unidad:'Bolsa 1 kg',precio:92,antes:108,cat:'enchilados',etiqueta:'top',piezas:120,stock:55,tope:20,desc:'Gomitas con chile en polvo. La categoría que más ha crecido en el último año.'},
      {id:'enc-03',nombre:'Cacahuates japoneses enchilados',marca:'De la Rosa',unidad:'Bolsa 500 g',precio:56,cat:'enchilados',piezas:60,stock:30,tope:20,desc:'Botana crujiente con chile. Se pide mucho junto con las bebidas.'},
      {id:'enc-04',nombre:'Polvo de chile con limón',marca:'Vero',unidad:'Bote 250 g',precio:38,cat:'enchilados',piezas:0,stock:40,tope:20,desc:'Para fruta, dulces o botana. Muchos lo llevan junto con las gomitas.'},
      {id:'enc-05',nombre:'Pulpa de tamarindo en vaso',marca:'Anáhuac',unidad:'Caja 20 vasitos',precio:110,cat:'enchilados',piezas:20,stock:25,tope:20,desc:'Vasito individual con chile y sal. Práctico para reventa.'},
      {id:'enc-06',nombre:'Mango enchilado deshidratado',marca:'Vero',unidad:'Bolsa 400 g',precio:84,cat:'enchilados',etiqueta:'nuevo',piezas:45,stock:20,tope:20,desc:'Mango en tiras con chile. De los que más han pegado este año.'},
      {id:'enc-07',nombre:'Rielitos de tamarindo',marca:'Vero',unidad:'Caja 24 piezas',precio:78,cat:'enchilados',piezas:24,stock:30,tope:20,desc:'Tiras de tamarindo con chile en presentación individual.'},
      {id:'enc-08',nombre:'Cueritos enchilados',marca:'Anáhuac',unidad:'Bolsa 500 g',precio:64,cat:'enchilados',piezas:70,stock:30,tope:20,desc:'Gomita salada y picosa. La botana de dulcería por excelencia.'},
      {id:'fie-01',nombre:'Surtido piñatero armado',marca:'Dulcerías Candy',unidad:'Paquete 3 kg',precio:250,antes:290,cat:'fiesta',etiqueta:'top',piezas:0,stock:25,tope:10,desc:'Mezcla lista para rellenar piñata: gomitas, paletas, caramelos y enchilados.'},
      {id:'fie-02',nombre:'Globos metálicos surtidos',marca:'',unidad:'Paquete 12 piezas',precio:80,cat:'fiesta',etiqueta:'nuevo',piezas:0,stock:30,tope:20,desc:'Colores metálicos surtidos. Combínalos con el color de tu evento.'},
      {id:'fie-03',nombre:'Velas mágicas de chispas',marca:'',unidad:'Paquete 10 piezas',precio:40,cat:'fiesta',piezas:0,stock:40,tope:20,desc:'Las que no se apagan al soplar. Para el momento del pastel.'},
      {id:'fie-04',nombre:'Bolsitas de dulces armadas',marca:'Dulcerías Candy',unidad:'10 bolsitas',precio:150,cat:'fiesta',piezas:0,stock:20,tope:20,desc:'Ya preparadas y selladas. Nos dices cuántos invitados y las dejamos listas.'},
      {id:'fie-05',nombre:'Piñata de estrella mediana',marca:'',unidad:'1 pieza',precio:180,cat:'fiesta',piezas:0,stock:15,tope:10,desc:'Piñata tradicional de papel. Aguanta bien y se ve grande en la foto.'},
      {id:'fie-06',nombre:'Bolsitas de celofán decoradas',marca:'',unidad:'Paquete 25 piezas',precio:45,cat:'fiesta',piezas:25,stock:35,tope:20,desc:'Vacías, para que tú armes el surtido. Con listones de colores incluidos.'},
      {id:'fie-07',nombre:'Serpentinas y confeti',marca:'',unidad:'Paquete 12 piezas',precio:55,cat:'fiesta',piezas:0,stock:30,tope:20,desc:'Para el momento de la foto. Colores surtidos.'},
      {id:'fie-08',nombre:'Platos y vasos temáticos',marca:'',unidad:'Paquete 25 juegos',precio:120,cat:'fiesta',piezas:0,stock:25,tope:20,desc:'Desechables a juego. Varios diseños disponibles en tienda.'},
      {id:'fie-09',nombre:'Piñata de personaje grande',marca:'',unidad:'1 pieza',precio:320,antes:365,cat:'fiesta',piezas:0,stock:10,tope:5,desc:'Piñata grande de papel. Pregunta por diseños disponibles.'}
    ];

    let PRODUCTOS = [...PRODUCTOS_BASE];

    const BANNERS_RESPALDO = [
      { clase:'banner--1', tag:'Envío a domicilio', titulo:'Te lo llevamos a casa',
        texto:'Dentro de la ciudad de Puebla. Arma tu pedido y nosotros vemos la entrega, o recógelo gratis en sucursal.',
        cta:'Comprar ahora', destino:'#catalogo', imagen_banner_url:'' },
      { clase:'banner--2', tag:'Ahorro por volumen', titulo:'5% desde 5 piezas',
        texto:'Junta 5 o más piezas del mismo producto y esa línea baja 5%. Producto por producto, sin monto mínimo.',
        cta:'Ver el catálogo', destino:'#oferta', imagen_banner_url:'' },
      { clase:'banner--3', tag:'Herramienta gratis', titulo:'Te armamos la piñata',
        texto:'Elige dulces uno por uno y míralos caer dentro. Cuando quedes conforme, cómpralo en línea.',
        cta:'Llenar mi piñata', destino:'#pinata', imagen_banner_url:'' }
    ];

    let BANNERS = [...BANNERS_RESPALDO];

    const MARCAS = [
      {archivo:'GAPSA.png',      nombre:'Gapsa',           color:'#E30613'},
      {archivo:'VALENTINA.png',  nombre:'Salsa Valentina', color:'#FFD100'},
      {archivo:'COOLTOONS.png',  nombre:'Cooltoons',       color:'#0085CA'},
      {archivo:'BETAMEX.png',    nombre:'Betamex',         color:'#E30613'},
      {archivo:'BOTANERA.png',   nombre:'La Botanera',     color:'#E30613'},
      {archivo:'ALTEÑO.png',     nombre:'Alteño',          color:'#0085CA'},
      {archivo:'CUETARA.png',    nombre:'Cuétara',         color:'#D6001C'},
      {archivo:'MACM.png',       nombre:"Mac'ma",          color:'#7A2E2E'},
      {archivo:'MARS.png',       nombre:'Mars',            color:'#000000'},
      {archivo:'TUTSIPOP.png',   nombre:'Tutsi Pop',       color:'#D4007E'},
      {archivo:'KALU.png',       nombre:'Kalú',            color:'#F7941D'},
      {archivo:'ARCOR.png',      nombre:'Arcor',           color:'#0055A5'},
      {archivo:'KIPI.png',       nombre:'Kipi',            color:'#009639'},
      {archivo:'RICOLINO.png',   nombre:'Ricolino',        color:'#E30613'},
      {archivo:'BARCEL.png',     nombre:'Barcel',          color:'#F58220'},
      {archivo:'MARINELA.png',   nombre:'Marinela',        color:'#E4002B'},
      {archivo:'SABRITAS.png',   nombre:'Sabritas',        color:'#E32119'},
      {archivo:'GAMESA.png',     nombre:'Gamesa',          color:'#0055A5'},
      {archivo:'DELAROSA.png',   nombre:'De la Rosa',      color:'#E4002B'},
      {archivo:'VERO.png',       nombre:'Vero',            color:'#F7941D'}
    ];

    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    const dinero = n => '$' + Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
    const limpiar = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const escapar = t => String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const waLink  = m => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(m)}`;
    const nombreCat = id => (CATEGORIAS.find(c=>c.id===id)||{}).nombre || id;
    const imgDe = p => p.img || (CATEGORIAS.find(c=>c.id===p.cat)||{}).img || 'img/ICONO.png';
    const pctOff = p => p.descuentoPct || (p.antes ? Math.round((1 - p.precio/p.antes) * 100) : 0);
    const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leerJSON = (k, d) => { try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(_){ return d; } };
    const guardarJSON = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} };

    function avisar(msg, ico='🍬'){
      const cont = $('#avisos');
      if (!cont) return;
      const t = document.createElement('div');
      t.className = 'aviso';
      t.innerHTML = `<span aria-hidden="true">${ico}</span><span>${escapar(msg)}</span>`;
      cont.appendChild(t);
      setTimeout(()=>{ t.classList.add('sale'); t.addEventListener('animationend',()=>t.remove(),{once:true}); }, 2600);
    }

    /* ─────────── CATÁLOGO Y FILTROS ─────────── */
    const filtro = { cat:'todos', texto:'', rango:null, oferta:false, nuevo:false, orden:'relevancia', pagina:1 };

    function coincide(p){
      if (filtro.cat !== 'todos' && p.cat !== filtro.cat) return false;
      if (filtro.oferta && !p.antes) return false;
      if (filtro.nuevo && p.etiqueta !== 'nuevo') return false;
      if (filtro.rango){
        const r = RANGOS.find(x=>x.id===filtro.rango);
        if (r && (p.precio < r.min || p.precio >= r.max)) return false;
      }
      const q = limpiar(filtro.texto);
      if (q){
        const heno = limpiar(`${p.nombre} ${p.marca || ''} ${nombreCat(p.cat)} ${p.unidad} ${p.desc || ''}`);
        if (!q.split(' ').every(w => heno.includes(w))) return false;
      }
      return true;
    }

    function ordenar(lista){
      const l = [...lista];
      if (filtro.orden === 'menor')  return l.sort((a,b)=>a.precio-b.precio);
      if (filtro.orden === 'mayor')  return l.sort((a,b)=>b.precio-a.precio);
      if (filtro.orden === 'nombre') return l.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
      const peso = p => (p.etiqueta==='top'?0:p.antes?1:p.etiqueta==='nuevo'?2:3);
      return l.sort((a,b)=>peso(a)-peso(b));
    }

    const filtrados = () => ordenar(PRODUCTOS.filter(coincide));

    function tarjeta(p){
      const off = pctOff(p);
      const cinco = p.precio * (1 - CONFIG.descuentoPorProducto);
      const agotado = p.stock !== undefined && p.stock <= 0;
      const soloCotizar = p.es_transaccional === false;

      const sello = agotado ? `<span class="prod__off" style="background:#5F5C68">Agotado</span>`
                  : off ? `<span class="prod__off">${off}% OFF</span>`
                  : p.etiqueta==='nuevo' ? `<span class="prod__nuevo">Nuevo</span>` : '';

      const botonAccion = agotado
        ? `<button class="btn btn--fantasma btn--bloque btn--sm" disabled>Agotado</button>`
        : soloCotizar
        ? `<a class="btn btn--wa btn--bloque btn--sm" href="${waLink(`¡Hola! Quiero cotizar por mayoreo: ${p.nombre}`)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>`
        : `<button class="btn btn--secundario btn--bloque btn--sm" data-add="${p.id}">Agregar</button>`;

      return `
      <article class="prod" style="--c:${colorCat(p.cat)}">
        ${sello}
        <button class="prod__foto" data-ficha="${p.id}" aria-label="Ver ${escapar(p.nombre)}">
          <img src="${escapar(imgDe(p))}" alt="${escapar(p.nombre)}" loading="lazy" width="180" height="180" onerror="this.src='img/ICONO.png'">
        </button>
        <div class="prod__cuerpo">
          <p class="prod__cat">${nombreCat(p.cat)}${p.marca ? ` · ${escapar(p.marca)}` : ''}</p>
          <a class="prod__nom" href="#/producto/${p.id}">${escapar(p.nombre)}</a>
          ${p.antes ? `<span class="prod__antes">${dinero(p.antes)}</span>` : ''}
          <p class="prod__precio">${dinero(p.precio)}${off?` <i>${off}% OFF</i>`:''}</p>
          <p class="prod__unidad">${escapar(p.unidad)}</p>
          <p class="prod__envio">Llevando ${CONFIG.piezasParaDescuento}+: ${dinero(cinco)} c/u</p>
          <div class="prod__cta">${botonAccion}</div>
        </div>
      </article>`;
    }

    function pintarCatalogo(){
      const lista = filtrados();
      const paginas = Math.max(1, Math.ceil(lista.length / CONFIG.porPagina));
      filtro.pagina = Math.min(filtro.pagina, paginas);

      const desde = (filtro.pagina - 1) * CONFIG.porPagina;
      const pagina = lista.slice(desde, desde + CONFIG.porPagina);

      $('#rejilla').innerHTML = pagina.map(tarjeta).join('');
      $('#vacio').hidden = lista.length > 0;
      $('#migas-cat').textContent = filtro.cat==='todos' ? 'Todos los productos' : nombreCat(filtro.cat);

      $('#conteo').innerHTML = lista.length
        ? `<b>${lista.length}</b> ${lista.length===1?'producto':'productos'}` +
          (paginas>1 ? ` · página ${filtro.pagina} de ${paginas}` : '')
        : '';

      const chips = [];
      if (filtro.texto)  chips.push({k:'texto', t:`“${filtro.texto}”`});
      if (filtro.cat!=='todos') chips.push({k:'cat', t:nombreCat(filtro.cat)});
      if (filtro.rango)  chips.push({k:'rango', t:(RANGOS.find(r=>r.id===filtro.rango)||{}).nombre});
      if (filtro.oferta) chips.push({k:'oferta', t:'Con descuento'});
      if (filtro.nuevo)  chips.push({k:'nuevo', t:'Novedades'});

      $('#chips-activos').innerHTML = chips.map(c =>
        `<button class="chip" data-quitar="${c.k}"><b>${escapar(c.t)}</b> ✕</button>`).join('');

      pintarPaginas(paginas);
      pintarFiltros();
      $$('#catnav-links button').forEach(b => b.setAttribute('aria-current', b.dataset.cat === filtro.cat));
    }

    function pintarPaginas(total){
      if (total <= 1){ $('#paginas').innerHTML=''; return; }
      const act = filtro.pagina;
      const nums = new Set([1, total, act, act-1, act+1]);
      const orden = [...nums].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b);

      let html = `<button data-pag="${act-1}" ${act===1?'disabled':''}>‹</button>`;
      let prev = 0;
      orden.forEach(n=>{
        if (prev && n - prev > 1) html += `<button disabled>…</button>`;
        html += `<button data-pag="${n}" aria-current="${n===act}">${n}</button>`;
        prev = n;
      });
      html += `<button data-pag="${act+1}" ${act===total?'disabled':''}>›</button>`;
      $('#paginas').innerHTML = html;
    }

    function pintarFiltros(){
      const cuenta = id => PRODUCTOS.filter(p => id==='todos' || p.cat===id).length;
      $('#f-cats').innerHTML =
        [{id:'todos',nombre:'Todas'},...CATEGORIAS].map(c=>`
          <li><button data-fcat="${c.id}" aria-current="${filtro.cat===c.id}">
            <span>${c.nombre}</span><span>${cuenta(c.id)}</span></button></li>`).join('');

      $('#f-precio').innerHTML = RANGOS.map(r=>`
        <li><button data-frango="${r.id}" aria-current="${filtro.rango===r.id}">
          <span>${r.nombre}</span></button></li>`).join('');

      $('#f-oferta').checked = filtro.oferta;
      $('#f-nuevo').checked  = filtro.nuevo;
    }

    function irArriba(){ $('#catalogo')?.scrollIntoView({behavior:'smooth'}); }

    const abrirFiltros  = ()=>{ $('#filtros').classList.add('on'); $('#velo').hidden=false; };
    const cerrarFiltros = ()=>{
      $('#filtros').classList.remove('on');
      if ($('#carrito').hidden) $('#velo').hidden = true;
    };

    $('#filtros').addEventListener('click', e=>{
      const c = e.target.closest('[data-fcat]');
      if (c){ filtro.cat = c.dataset.fcat; filtro.pagina=1; pintarCatalogo(); cerrarFiltros(); return; }
      const r = e.target.closest('[data-frango]');
      if (r){ filtro.rango = filtro.rango===r.dataset.frango ? null : r.dataset.frango; filtro.pagina=1; pintarCatalogo(); }
    });

    $('#f-oferta').addEventListener('change', e=>{ filtro.oferta=e.target.checked; filtro.pagina=1; pintarCatalogo(); });
    $('#f-nuevo').addEventListener('change',  e=>{ filtro.nuevo =e.target.checked; filtro.pagina=1; pintarCatalogo(); });
    $('#f-limpiar').addEventListener('click', ()=>{
      Object.assign(filtro,{cat:'todos',texto:'',rango:null,oferta:false,nuevo:false,pagina:1});
      $('#q').value=''; pintarCatalogo(); cerrarFiltros();
    });
    $('#orden').addEventListener('change', e=>{ filtro.orden=e.target.value; filtro.pagina=1; pintarCatalogo(); });
    $('#chips-activos').addEventListener('click', e=>{
      const b = e.target.closest('[data-quitar]');
      if (!b) return;
      const k = b.dataset.quitar;
      if (k==='texto'){ filtro.texto=''; $('#q').value=''; }
      else if (k==='cat') filtro.cat='todos';
      else if (k==='rango') filtro.rango=null;
      else filtro[k]=false;
      filtro.pagina=1; pintarCatalogo();
    });
    $('#paginas').addEventListener('click', e=>{
      const b = e.target.closest('[data-pag]');
      if (!b || b.disabled) return;
      filtro.pagina = +b.dataset.pag;
      pintarCatalogo(); irArriba();
    });
    $('#abrir-filtros').addEventListener('click', abrirFiltros);
    $('#filtros-cerrar').addEventListener('click', ()=>{ cerrarFiltros(); $('#velo').hidden=true; });

    /* ─────────── FICHA DE PRODUCTO ─────────── */
    let cantidadFicha = 1;
    function pintarFicha(p){
      cantidadFicha = 1;
      const off = pctOff(p);
      const conDesc = p.precio * CONFIG.piezasParaDescuento * (1-CONFIG.descuentoPorProducto);
      const agotado = p.stock !== undefined && p.stock <= 0;
      const soloCotizar = p.es_transaccional === false;
      const descripcionFinal = p.desc && p.desc.trim()
        ? p.desc
        : `${p.nombre} en presentación ${p.unidad}. Disponible para compra en línea y recolección en sucursal.`;

      const botonesFicha = agotado
        ? `<button class="btn btn--fantasma btn--bloque" disabled>Agotado</button>`
        : soloCotizar
        ? `<a class="btn btn--wa btn--bloque" href="${waLink(`¡Hola! Quiero cotizar por mayoreo: ${p.nombre} (${p.unidad})`)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>`
        : `<button class="btn btn--primario btn--bloque" id="f-add">Agregar al pedido</button>
           <button class="btn btn--amarillo btn--bloque" id="f-comprar">Comprar ahora</button>`;

      $('#vista-producto').innerHTML = `
      <div class="ficha">
        <nav class="migas" aria-label="Ubicación">
          <a href="#/">Inicio</a><span aria-hidden="true">›</span>
          <a href="#/" data-ir-cat="${p.cat}">${nombreCat(p.cat)}</a>
          <span aria-hidden="true">›</span><span>${escapar(p.nombre)}</span>
        </nav>
        <div class="ficha__caja">
          <div class="ficha__galeria">
            <img src="${escapar(imgDe(p))}" alt="${escapar(p.nombre)}" width="420" height="420" onerror="this.src='img/ICONO.png'">
          </div>
          <div class="ficha__info">
            <p class="ficha__cat">${nombreCat(p.cat)}${p.marca ? ` · ${escapar(p.marca)}` : ''}${p.etiqueta==='top'?' · Más vendido':''}</p>
            <h1 class="ficha__nom">${escapar(p.nombre)}</h1>
            ${p.antes?`<p class="ficha__antes">${dinero(p.antes)}</p>`:''}
            <p class="ficha__precio">${dinero(p.precio)}${off?`<span class="ficha__off">${off}% OFF</span>`:''}</p>
            <p class="ficha__unidad">Presentación: ${escapar(p.unidad)}</p>
            <p class="ficha__envio"><span aria-hidden="true">🚚</span> Envío a domicilio en Puebla por ${dinero(CONFIG.costoEnvio)} · recoge gratis en sucursal</p>
            <div class="ficha__vol">
              Llevando <b>${CONFIG.piezasParaDescuento} o más piezas</b> de este producto,
              el precio baja a <b>${dinero(conDesc/CONFIG.piezasParaDescuento)}</b> cada una.
            </div>
            <p class="ficha__desc">${escapar(descripcionFinal)}</p>
            <div class="cantidad">
              <div class="cantidad__ctrl">
                <button type="button" id="f-menos" aria-label="Menos">−</button>
                <span id="f-cant">1</span>
                <button type="button" id="f-mas" aria-label="Más">+</button>
              </div>
              <small id="f-nota"></small>
            </div>
            <div class="ficha__cta">${botonesFicha}</div>
            <div class="ficha__meta">
              <span>Recoge sin costo en cualquiera de nuestras 8 sucursales de entrega.</span>
              <span>Paga con tarjeta o transferencia, o en efectivo al recoger en tienda.</span>
            </div>
          </div>
        </div>
      </div>`;

      $('#vista-tienda').hidden = true;
      $('#vista-producto').hidden = false;
      window.scrollTo(0, 0);

      const nota = ()=>{
        $('#f-cant').textContent = cantidadFicha;
        $('#f-nota').textContent = cantidadFicha >= CONFIG.piezasParaDescuento
          ? `Aplica −5%: ${dinero(p.precio*cantidadFicha*(1-CONFIG.descuentoPorProducto))}`
          : `Faltan ${CONFIG.piezasParaDescuento-cantidadFicha} para el 5%`;
      };
      nota();

      $('#f-menos').addEventListener('click', ()=>{ if(cantidadFicha>1) cantidadFicha--; nota(); });
      $('#f-mas').addEventListener('click',   ()=>{ if(cantidadFicha < (p.tope || 20)) cantidadFicha++; nota(); });

      const btnComprar = $('#f-comprar');
      if (btnComprar) {
        btnComprar.addEventListener('click', ()=>{
          if (agregar(p.id, cantidadFicha, true)) abrirPago();
        });
      }

      const btnAdd = $('#f-add');
      if (btnAdd) {
        btnAdd.addEventListener('click', function() {
          if (!agregar(p.id, cantidadFicha)) return;
          const txtOriginal = this.innerHTML;
          this.innerHTML = '¡Agregado! ✔️';
          this.classList.add('btn--agregado');
          setTimeout(() => {
            this.innerHTML = txtOriginal;
            this.classList.remove('btn--agregado');
          }, 1500);
        });
      }
    }

    function router(){
      const h = location.hash;
      const m = h.match(/^#\/producto\/(.+)$/);
      if (m){
        const p = PRODUCTOS.find(x=>String(x.id)===String(m[1]));
        if (p){ pintarFicha(p); return; }
      }
      $('#vista-producto').hidden = true;
      $('#vista-tienda').hidden = false;
      if (h && h.length>1 && !h.startsWith('#/')){
        const el = document.getElementById(h.slice(1));
        if (el) setTimeout(()=>el.scrollIntoView({behavior:'smooth'}), 60);
      }
    }
    window.addEventListener('hashchange', router);

    /* ─────────── CARRITO ─────────── */
    const LLAVE = 'candy_pedido_v2';
    let pedido = {};

    function cargarPedido(){
      try{
        const g = JSON.parse(localStorage.getItem(LLAVE)||'{}');
        Object.entries(g).forEach(([id,c])=>{ if(c>0) pedido[id]=c; });
      }catch(_){ pedido={}; }
    }
    function guardarPedido(){ try{ localStorage.setItem(LLAVE, JSON.stringify(pedido)); }catch(_){} }

    function totales(){
      let piezas=0, subtotal=0, descuento=0;
      const lineas=[];
      Object.entries(pedido).forEach(([id,cant])=>{
        const p = PRODUCTOS.find(x=>String(x.id)===String(id));
        if(!p) return;
        const bruto  = Number((p.precio * cant).toFixed(2));
        const aplica = cant >= CONFIG.piezasParaDescuento;
        const ahorro = aplica ? Number((bruto * CONFIG.descuentoPorProducto).toFixed(2)) : 0;
        piezas+=cant; subtotal+=bruto; descuento+=ahorro;
        lineas.push({
          p, cant, bruto, aplica, ahorro,
          neto: Number((bruto - ahorro).toFixed(2)),
          faltan: aplica ? 0 : CONFIG.piezasParaDescuento - cant
        });
      });
      return {
        piezas,
        subtotal: Number(subtotal.toFixed(2)),
        descuento: Number(descuento.toFixed(2)),
        total: Number((subtotal - descuento).toFixed(2)),
        lineas,
        hayDescuento: descuento > 0,
        conDescuento: lineas.filter(l=>l.aplica).length
      };
    }

    function agregar(id, cant=1, callado=false){
      const p = PRODUCTOS.find(x=>String(x.id)===String(id));
      if(!p) return false;
      const maxTope = p.tope || 20;
      if ((pedido[id] || 0) + cant > maxTope) {
        avisar(`Máximo ${maxTope} piezas por pedido de este artículo`, '⚠️');
        return false;
      }
      pedido[id] = (pedido[id]||0) + cant;
      guardarPedido(); pintarCarrito();
      if(!callado) avisar(`${p.nombre} agregado`, '🛒');
      $('#cart-n')?.animate([{transform:'scale(1)'},{transform:'scale(1.4)'},{transform:'scale(1)'}], {duration:320, easing:'ease-out'});
      return true;
    }

    function pintarCarrito(){
      const { piezas, subtotal, descuento, total, lineas, hayDescuento } = totales();
      $('#carrito-lista').innerHTML = lineas.map(({p,cant,bruto,aplica,neto,faltan})=>`
        <li class="item">
          <div class="item__foto"><img src="${escapar(imgDe(p))}" alt="" loading="lazy" onerror="this.src='img/ICONO.png'"></div>
          <div>
            <p class="item__n">${escapar(p.nombre)}</p>
            <p class="item__u">${escapar(p.unidad)} · ${dinero(p.precio)} c/u</p>
            <div class="item__q">
              <button data-menos="${p.id}" aria-label="Quitar uno">−</button>
              <span>${cant}</span>
              <button data-mas="${p.id}" aria-label="Agregar uno">+</button>
            </div>
            <p class="item__hint ${aplica?'item__hint--on':''}">${
              aplica ? `−5% aplicado` : `Faltan ${faltan} para −5%`}</p>
          </div>
          <div class="item__der">
            <button class="item__x" data-borrar="${p.id}" aria-label="Eliminar">✕</button>
            ${aplica?`<span class="item__antes">${dinero(bruto)}</span>`:''}
            <span class="item__p ${aplica?'item__p--off':''}">${dinero(aplica?neto:bruto)}</span>
          </div>
        </li>`).join('');

      $('#carrito-vacio').hidden = piezas>0;
      $('#c-sub').textContent   = dinero(subtotal);
      $('#c-off').textContent   = '−'+dinero(descuento);
      $('#fila-off').hidden     = !hayDescuento;
      $('#c-total').textContent = dinero(total);
      $('#pagar').disabled      = piezas===0;

      $('#cart-n').textContent = piezas;
      $('#cart-total-head').textContent = dinero(total);
      $('#movil-n').textContent = `${piezas} ${piezas===1?'producto':'productos'}`;
      $('#movil-total').textContent = dinero(total);

      const movil = $('#movil');
      movil.hidden = piezas===0;
      movil.classList.toggle('on', piezas>0);
      document.body.classList.toggle('con-pedido', piezas>0);

      guardarPedido();
    }

    const abrirCarrito = ()=>{ $('#carrito').hidden=false; $('#velo').hidden=false; document.body.style.overflow='hidden'; $('#carrito-cerrar')?.focus(); };
    const cerrarCarrito= ()=>{ $('#carrito').hidden=true; $('#velo').hidden=true; document.body.style.overflow=''; };

    $('#abrir-carrito').addEventListener('click', abrirCarrito);
    $('#movil-abrir').addEventListener('click', abrirCarrito);
    $('#carrito-cerrar').addEventListener('click', cerrarCarrito);
    $('#carrito-ir').addEventListener('click', ()=>{ cerrarCarrito(); irArriba(); });
    $('#velo').addEventListener('click', ()=>{ cerrarCarrito(); cerrarFiltros(); });
    $('#pagar').addEventListener('click', ()=>{ cerrarCarrito(); abrirPago(); });

    document.addEventListener('keydown', e=>{
      if(e.key!=='Escape') return;
      if(!$('#carrito').hidden) cerrarCarrito();
      else if($('#filtros').classList.contains('on')){ cerrarFiltros(); $('#velo').hidden=true; }
    });

    document.addEventListener('click', e=>{
      const btnBanner = e.target.closest('[data-banner-destino]');
      if (btnBanner) {
        e.preventDefault();
        const dest = btnBanner.dataset.bannerDestino || '#catalogo';
        location.hash = '#/';

        if (dest === '#pinata' || dest === '#aguinaldos') {
          cambiarModo(dest === '#aguinaldos' ? 'bolsa' : 'pinata');
          setTimeout(() => document.getElementById('pinata')?.scrollIntoView({ behavior: 'smooth' }), 60);
          return;
        }

        Object.assign(filtro, { cat: 'todos', texto: '', rango: null, oferta: false, nuevo: false, pagina: 1 });
        $('#q').value = '';

        if (dest === '#oferta') {
          filtro.oferta = true;
        } else if (dest.startsWith('#cat:')) {
          filtro.cat = dest.slice(5);
        } else if (dest.startsWith('#marca:')) {
          const marcaObjetivo = dest.slice(7);
          filtro.texto = marcaObjetivo;
          $('#q').value = marcaObjetivo;
        }

        pintarCatalogo();
        setTimeout(irArriba, 60);
        return;
      }

      if (e.target.closest('[data-abrir-cuenta]')) {
        cerrarCarrito();
        abrirCuenta();
        return;
      }

      const a = e.target.closest('[data-add]');
      if(a){
        if (!agregar(a.dataset.add)) return;
        const txtOriginal = a.innerHTML;
        a.innerHTML = '¡Agregado! ✔️';
        a.classList.add('btn--agregado');
        setTimeout(() => { a.innerHTML = txtOriginal; a.classList.remove('btn--agregado'); }, 1500);
        return;
      }
      const m = e.target.closest('[data-mas]');
      if(m){ agregar(m.dataset.mas, 1, true); return; }
      const n = e.target.closest('[data-menos]');
      if(n){ const id=n.dataset.menos; pedido[id]--; if(pedido[id]<=0) delete pedido[id]; guardarPedido(); pintarCarrito(); return; }
      const x = e.target.closest('[data-borrar]');
      if(x){ delete pedido[x.dataset.borrar]; guardarPedido(); pintarCarrito(); return; }
      const f = e.target.closest('[data-ficha]');
      if(f){ location.hash = `#/producto/${f.dataset.ficha}`; return; }
      const ic = e.target.closest('[data-ir-cat]');
      if(ic){ e.preventDefault(); filtro.cat=ic.dataset.irCat; filtro.pagina=1; location.hash='#/'; pintarCatalogo(); setTimeout(irArriba,80); return; }
      const io = e.target.closest('[data-ir-oferta]');
      if(io){ filtro.oferta=true; filtro.cat='todos'; filtro.pagina=1; pintarCatalogo(); irArriba(); }
    });

    /* ─────────── BUSCADOR ─────────── */
    const input = $('#q');
    const sug   = $('#sugerencias');
    const ATAJOS = ['Gomitas','Chocolates','Ricolino','Vero','Mazapán','Piñatas'];
    let sugI = -1;

    function cerrarSug(){ sug.classList.remove('on'); sug.innerHTML=''; sugI=-1; input.setAttribute('aria-expanded','false'); }
    function pintarSug(){
      const q = limpiar(input.value);
      if(!q){
        sug.innerHTML = `<p class="sug__t">Búsquedas frecuentes</p>
          <div class="sug__chips">${ATAJOS.map(a=>`<button class="sug__chip" data-txt="${escapar(a)}">${escapar(a)}</button>`).join('')}</div>`;
      } else {
        const hits = PRODUCTOS.filter(p=>{
          const heno = limpiar(`${p.nombre} ${p.marca || ''} ${nombreCat(p.cat)} ${p.unidad} ${p.desc || ''}`);
          return q.split(' ').every(w=>heno.includes(w));
        }).slice(0,7);
        sug.innerHTML = hits.length
          ? hits.map((p,i)=>`
              <button class="sug__it" role="option" aria-selected="false" data-id="${p.id}" data-i="${i}">
                <img src="${escapar(imgDe(p))}" alt="" loading="lazy" onerror="this.src='img/ICONO.png'">
                <span><span class="sug__n">${escapar(p.nombre)}</span><br>
                      <span class="sug__c">${nombreCat(p.cat)}${p.marca ? ` · ${escapar(p.marca)}` : ''} · ${escapar(p.unidad)}</span></span>
                <span class="sug__p">${dinero(p.precio)}</span>
              </button>`).join('')
          : `<p class="sug__nada">Sin resultados para “${escapar(input.value)}”. Manejamos más de mil productos en tienda — pregúntanos por WhatsApp.</p>`;
      }
      sug.classList.add('on');
      input.setAttribute('aria-expanded','true');
      sugI = -1;
    }
    function moverSug(paso){
      const it = $$('.sug__it', sug);
      if(!it.length) return;
      sugI = (sugI+paso+it.length)%it.length;
      it.forEach((el,i)=>{ el.classList.toggle('on', i===sugI); el.setAttribute('aria-selected', i===sugI); });
    }
    input.addEventListener('input', ()=>{ pintarSug(); filtro.texto = input.value; filtro.pagina=1; if(!$('#vista-producto').hidden) location.hash='#/'; pintarCatalogo(); });
    input.addEventListener('focus', pintarSug);
    input.addEventListener('keydown', e=>{
      if(e.key==='ArrowDown'){ e.preventDefault(); moverSug(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); moverSug(-1); }
      else if(e.key==='Escape'){ cerrarSug(); input.blur(); }
      else if(e.key==='Enter'){
        const it = $$('.sug__it', sug);
        if(sugI>=0 && it[sugI]){ e.preventDefault(); location.hash=`#/producto/${it[sugI].dataset.id}`; cerrarSug(); }
      }
    });
    $('#form-busqueda').addEventListener('submit', e=>{ e.preventDefault(); filtro.texto = input.value; cerrarSug(); if(!$('#vista-producto').hidden) location.hash='#/'; pintarCatalogo(); irArriba(); });
    sug.addEventListener('click', e=>{
      const it = e.target.closest('.sug__it');
      if(it){ location.hash=`#/producto/${it.dataset.id}`; cerrarSug(); return; }
      const ch = e.target.closest('.sug__chip');
      if(ch){ input.value=ch.dataset.txt; filtro.texto=ch.dataset.txt; cerrarSug(); if(!$('#vista-producto').hidden) location.hash='#/'; pintarCatalogo(); irArriba(); }
    });
    document.addEventListener('click', e=>{ if(!e.target.closest('.buscador')) cerrarSug(); });

    /* ─────────── BANNERS ─────────── */
    let banner = 0, bannerTimer;
    function pintarBanners(){
      $('#banners').innerHTML = BANNERS.map(b => {
        const url = b.imagen_banner_url || '';
        const tieneImagenFondo =
          url.startsWith('http') ||
          url.startsWith('data:') ||
          url.startsWith('/img/') ||
          url.startsWith('img/');

        const rutaLimpia = url.startsWith('img/') ? `/${url}` : url;
        const estiloFondo = tieneImagenFondo
          ? `style="background-image: linear-gradient(90deg, rgba(20, 8, 32, 0.72) 0%, rgba(20, 8, 32, 0.28) 65%, rgba(20, 8, 32, 0.15) 100%), url('${rutaLimpia}'); background-size: cover; background-position: center;"`
          : '';

        const destino = b.destino || '#catalogo';

        return `
        <article class="banner ${b.clase}" ${estiloFondo}>
          <span class="banner__tag">${escapar(b.tag)}</span>
          <h2>${escapar(b.titulo)}</h2>
          <p>${escapar(b.texto)}</p>
          <a class="btn" href="${escapar(destino)}" data-banner-destino="${escapar(destino)}">${escapar(b.cta)}</a>
        </article>`;
      }).join('');

      $('#banner-dots').innerHTML = BANNERS.map((_,i)=>
        `<button data-b="${i}" aria-current="${i===banner}" aria-label="Promoción ${i+1}"></button>`).join('');
    }
    function irBanner(i){
      banner = (i+BANNERS.length)%BANNERS.length;
      $('#banners').style.transform = `translateX(-${banner*100}%)`;
      $$('#banner-dots button').forEach((d,n)=>d.setAttribute('aria-current', n===banner));
    }
    function autoBanner(){
      clearInterval(bannerTimer);
      if(!quieto()) bannerTimer = setInterval(()=>irBanner(banner+1), 6500);
    }
    $('#banner-prev').addEventListener('click', ()=>{ irBanner(banner-1); autoBanner(); });
    $('#banner-next').addEventListener('click', ()=>{ irBanner(banner+1); autoBanner(); });
    $('#banner-dots').addEventListener('click', e=>{ const b=e.target.closest('[data-b]'); if(b){ irBanner(+b.dataset.b); autoBanner(); } });

    function pintarEstantes(){
      const top = PRODUCTOS.filter(p=>p.etiqueta==='top' || p.antes).slice(0,10);
      const off = PRODUCTOS.filter(p=>p.antes).slice(0,10);
      $('#e-top').innerHTML = top.map(tarjeta).join('');
      $('#e-off').innerHTML = off.map(tarjeta).join('');
    }

    $$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{
      const pista = document.getElementById(b.dataset.scroll);
      pista.scrollBy({left: (+b.dataset.dir) * pista.clientWidth * .8, behavior:'smooth'});
    }));

    function pintarRubros(){
      $('#rubros').innerHTML = CATEGORIAS.map(c=>{
        const n = PRODUCTOS.filter(p=>p.cat===c.id).length;
        return `<button class="rubro" data-ir-cat="${c.id}" style="--c:${c.color}">
          <span class="rubro__disco"><img src="${c.img}" alt="" loading="lazy" width="52" height="52"></span>
          <span class="rubro__n">${c.nombre}</span><small>${n} productos</small></button>`;
      }).join('');
    }

    function pintarCatnav(){
      $('#catnav-links').innerHTML =
        `<button data-cat="todos" data-ir-cat="todos" aria-current="true">Todos</button>` +
        CATEGORIAS.map(c=>`<button data-cat="${c.id}" data-ir-cat="${c.id}">${c.nombre}</button>`).join('') +
        `<button class="destacado" data-ir-oferta="1">Ofertas</button>`;
      $('#pie-cats').innerHTML = CATEGORIAS.map(c=>`<button data-ir-cat="${c.id}">${c.nombre}</button>`).join('');
    }

    function pintarMarcas(){
      const uno = MARCAS.map(m=>`
        <span class="marca" style="--c:${m.color}">
          <img src="img/${escapar(m.archivo)}" alt="${escapar(m.nombre)}" decoding="async"
               onerror="this.closest('.marca').classList.add('sin-foto');this.remove()">
          <b>${escapar(m.nombre)}</b>
        </span>`).join('');
      $('#marcas').innerHTML = uno + uno;
    }

    /* ─────────── LLENA TU PIÑATA + MODO AGUINALDOS ─────────── */
    const META_PINATA  = 60;
    const META_BOLSA   = 10;
    const CELOFAN      = 'fie-06';
    const LLAVE_PINATA = 'candy_pinata_v2';
    const LLAVE_BOLSA  = 'candy_aguinaldo_v1';
    const LLAVE_MODO   = 'candy_relleno_modo';
    const ALTO_RELLENO = 152;

    let modo = 'pinata';
    let pinata = {};
    let bolsa = {};
    let nBolsas = 20;

    const enBolsa   = () => modo === 'bolsa';
    const objetivo  = () => enBolsa() ? $('#bolsa-img') : $('#pinata-img');
    const contenido = () => enBolsa() ? bolsa : pinata;
    const sumar     = o => Object.values(o).reduce((a,b)=>a+b,0);
    const sirveParaBolsa = p => p.cat !== 'fiesta' && Number(p.piezas) > 0;

    function pintarDulces(){
      const lista = PRODUCTOS.filter(p => (enBolsa() ? sirveParaBolsa(p) : p.cat !== 'fiesta') && (p.stock === undefined || p.stock > 0));
      $('#dulces').innerHTML = lista.map(p=>`
        <button class="dulce" data-pinata="${p.id}" aria-label="Echar ${escapar(p.nombre)}">
          <img src="${escapar(imgDe(p))}" alt="" loading="lazy" width="46" height="46" onerror="this.src='img/ICONO.png'">
          <span>${escapar(p.nombre)}</span>
          <b>${enBolsa() ? dinero(p.precio / p.piezas) + ' c/u' : dinero(p.precio)}</b>
        </button>`).join('');
    }

    function sacudir(){
      if(quieto()) return;
      objetivo()?.animate(enBolsa() ? [
        {transform:'scale(1)'},{transform:'scale(1.06,.95)'},
        {transform:'scale(.97,1.04)'},{transform:'scale(1)'}
      ] : [
        {transform:'rotate(0) scale(1)'},{transform:'rotate(-7deg) scale(1.05)'},
        {transform:'rotate(6deg) scale(1.03)'},{transform:'rotate(0) scale(1)'}
      ], {duration:480, easing:'ease-out'});
    }

    function volar(origen, src){
      if(quieto() || !origen || !objetivo()) return sacudir();
      const o = origen.getBoundingClientRect();
      const d = objetivo().getBoundingClientRect();

      const v = document.createElement('div');
      v.className = 'vuelo';
      v.innerHTML = `<img src="${escapar(src)}" alt="">`;
      v.style.left = (o.left + o.width / 2) + 'px';
      v.style.top  = (o.top + o.height / 2) + 'px';
      document.body.appendChild(v);

      const dx = (d.left + d.width / 2) - (o.left + o.width / 2);
      const dy = (d.top + d.height * (enBolsa() ? .2 : .4)) - (o.top + o.height / 2);

      v.animate([
        {transform:'translate(-50%,-50%) scale(1) rotate(0deg)', opacity:1},
        {transform:`translate(calc(-50% + ${dx*.5}px), calc(-50% + ${dy*.5-100}px)) scale(1.25) rotate(200deg)`, opacity:1, offset:.55},
        {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.2) rotate(440deg)`, opacity:0}
      ], {duration:760, easing:'cubic-bezier(.42,0,.58,1)'}).onfinish = ()=>{ v.remove(); sacudir(); };
    }

    function paquetes(){
      if(!enBolsa()) return {...pinata};
      const r = {};
      Object.entries(bolsa).forEach(([id,c])=>{
        const p = PRODUCTOS.find(x=>String(x.id)===String(id));
        if(p && p.piezas > 0) r[id] = Math.ceil((c * nBolsas) / p.piezas);
      });
      if(Object.keys(r).length){
        const cel = PRODUCTOS.find(x=>String(x.id)===CELOFAN);
        if(cel && cel.piezas > 0) r[CELOFAN] = Math.ceil(nBolsas / cel.piezas);
      }
      return r;
    }

    const importeDe = paq => Object.entries(paq).reduce((s,[id,c])=>{
      const p = PRODUCTOS.find(x=>String(x.id)===String(id));
      return s + (p ? p.precio * c : 0);
    }, 0);

    function pintarPinata(){
      const cont = contenido();
      const ids = Object.keys(cont).filter(id => PRODUCTOS.some(x=>String(x.id)===String(id)));
      const piezas = ids.reduce((a,id)=>a + cont[id], 0);
      const paq = paquetes();
      const importe = importeDe(paq);
      const meta = enBolsa() ? META_BOLSA : META_PINATA;
      const frac = Math.min(1, piezas / meta);

      $('#pinata-n').textContent = piezas;
      $('#pinata-fill').style.width = (frac * 100) + '%';
      const relleno = $('#bolsa-relleno');
      if (relleno) relleno.style.transform = `translateY(${ALTO_RELLENO * (1 - frac)}px)`;

      if(enBolsa()){
        $('#pinata-estado').textContent = piezas===0 ? 'Tu bolsita está vacía'
          : `${piezas} ${piezas===1?'dulce':'dulces'} por bolsita` + (piezas>=meta ? ' · ¡bien surtida!' : '');
      } else {
        $('#pinata-estado').textContent = piezas===0 ? 'Todavía está vacía'
          : piezas>=meta ? `¡Bien llena! ${piezas} dulces · ${dinero(importe)}`
          : `${piezas} ${piezas===1?'dulce':'dulces'} adentro · ${dinero(importe)}`;
      }

      $('#pinata-lista').innerHTML = ids.map(id=>{
        const p = PRODUCTOS.find(x=>String(x.id)===String(id));
        const detalle = enBolsa() ? `<small>${paq[id]} × ${escapar(p.unidad)}</small>` : '';
        return `<li class="pieza">
          <img src="${escapar(imgDe(p))}" alt="" loading="lazy" onerror="this.src='img/ICONO.png'">
          <span>${escapar(p.nombre)}${detalle}</span><b>${cont[id]}${enBolsa()?' c/u':''}</b>
          <button data-sacar="${id}" aria-label="Sacar ${escapar(p.nombre)}">✕</button></li>`;
      }).join('');

      const res = $('#bolsa-resumen');
      res.hidden = !enBolsa() || piezas===0;
      if(enBolsa() && piezas){
        const cel = PRODUCTOS.find(x=>String(x.id)===CELOFAN);
        const totalPaq = sumar(paq);
        res.innerHTML = `Para <b>${nBolsas} bolsitas</b> necesitas <b>${totalPaq} paquetes</b>`
          + (cel && paq[CELOFAN] ? ` (incluye ${paq[CELOFAN]} de ${escapar(cel.nombre.toLowerCase())})` : '')
          + `<strong>${dinero(importe)}</strong><small>Aprox. ${dinero(importe / nBolsas)} por bolsita</small>`;
      }

      $('#pinata-add').disabled = piezas===0;
      $('#pinata-vaciar').hidden = piezas===0;
      $('#pinata-comprar').disabled = piezas===0;

      guardarJSON(LLAVE_PINATA, pinata);
      guardarJSON(LLAVE_BOLSA, { items: bolsa, n: nBolsas });
    }

    function cambiarModo(nuevo){
      modo = nuevo === 'bolsa' ? 'bolsa' : 'pinata';
      const b = enBolsa();
      $$('.modo').forEach(x=>x.setAttribute('aria-pressed', String(x.dataset.modo === modo)));
      $('#pinata-titulo').textContent = b ? 'Arma tus aguinaldos' : 'Llena tu piñata';
      $('#pinata-txt').textContent = b
        ? 'Arma una bolsita dulce por dulce y dinos cuántas necesitas. Te calculamos cuántos paquetes comprar, con todo y bolsitas de celofán.'
        : 'Toca dulces y míralos caer dentro. Cuando quedes conforme, pásalo a tu pedido o cómpralo de una vez.';
      $('#dulces-tip').textContent = b ? 'Toca un dulce para meterlo a la bolsita' : 'Toca un dulce para echarlo';
      $('#pinata-vaciar').textContent = b ? 'Vaciar la bolsita' : 'Vaciar la piñata';
      $('#pinata-img').hidden = b;
      $('#bolsa-img').toggleAttribute('hidden', !b);
      $('#bolsa-cuantas').hidden = !b;
      $('#bolsa-n').value = nBolsas;
      try{ localStorage.setItem(LLAVE_MODO, modo); }catch(_){}
      pintarDulces();
      pintarPinata();
    }

    function fijarBolsas(n){
      nBolsas = Math.max(1, Math.min(1000, Math.round(Number(n)) || 1));
      $('#bolsa-n').value = nBolsas;
      pintarPinata();
    }

    $$('.modo').forEach(b=>b.addEventListener('click', ()=>cambiarModo(b.dataset.modo)));
    $$('[data-bolsas]').forEach(b=>b.addEventListener('click', ()=>fijarBolsas(nBolsas + Number(b.dataset.bolsas))));
    $('#bolsa-n').addEventListener('change', e=>fijarBolsas(e.target.value));

    $('#dulces').addEventListener('click', e=>{
      const b = e.target.closest('[data-pinata]');
      if(!b) return;
      const p = PRODUCTOS.find(x=>String(x.id)===String(b.dataset.pinata));
      if(!p) return;
      const cont = contenido();
      cont[p.id] = (cont[p.id]||0) + 1;
      volar($('img', b), imgDe(p));
      pintarPinata();

      const piezas = sumar(cont);
      const meta = enBolsa() ? META_BOLSA : META_PINATA;
      if(piezas === meta){
        avisar(enBolsa() ? '¡Tu bolsita ya va bien surtida!' : '¡Tu piñata ya está bien llena!', '🎉');
      }
    });

    $('#pinata-lista').addEventListener('click', e=>{
      const x = e.target.closest('[data-sacar]');
      if(x){ delete contenido()[x.dataset.sacar]; pintarPinata(); }
    });
    $('#pinata-vaciar').addEventListener('click', ()=>{
      if(enBolsa()){ bolsa={}; avisar('Bolsita vacía','🎁'); }
      else{ pinata={}; avisar('Piñata vacía','🪅'); }
      pintarPinata();
    });

    function pinataAlPedido(){
      Object.entries(paquetes()).forEach(([id,c])=>{ pedido[id]=(pedido[id]||0)+c; });
      guardarPedido(); pintarCarrito();
    }
    $('#pinata-comprar').addEventListener('click', ()=>{ pinataAlPedido(); abrirPago(); });
    $('#pinata-add').addEventListener('click', ()=>{
      pinataAlPedido();
      avisar(enBolsa() ? `Tus ${nBolsas} aguinaldos pasaron al pedido` : 'Tu piñata pasó al pedido','🎉');
      abrirCarrito();
    });

    /* ─────────── PREGUNTAS, MENÚ MÓVIL Y WHATSAPP ─────────── */
    $$('.qa__q').forEach(b=>b.addEventListener('click',()=>{
      const bloque = b.closest('.qa');
      const abierto = bloque.classList.contains('on');
      $$('.qa').forEach(q=>{ q.classList.remove('on'); $('.qa__q',q).setAttribute('aria-expanded','false'); });
      if(!abierto){ bloque.classList.add('on'); b.setAttribute('aria-expanded','true'); }
    }));

    const menuAbierto = ()=> $('#catnav-links').classList.contains('on');
    const altoHead = ()=> document.documentElement.style
      .setProperty('--head-h', Math.round($('.head').getBoundingClientRect().bottom) + 'px');
    const cerrarMenu = ()=>{
      $('#catnav-links').classList.remove('on');
      $('#burger').setAttribute('aria-expanded','false');
    };
    $('#burger').addEventListener('click', ()=>{
      altoHead();
      const on = $('#catnav-links').classList.toggle('on');
      $('#burger').setAttribute('aria-expanded', on);
    });
    $('#catnav-links').addEventListener('click', cerrarMenu);
    window.addEventListener('scroll', ()=>{ if(menuAbierto()) altoHead(); }, {passive:true});
    window.addEventListener('resize', ()=>{ if(menuAbierto()) altoHead(); });
    document.addEventListener('click', e=>{
      if(menuAbierto() && !e.target.closest('#catnav, #burger')) cerrarMenu();
    });

    const M_GENERAL = '¡Hola! 👋 Vi su tienda en línea y me gustaría más información.';
    $('#wa-head').href  = waLink(M_GENERAL);
    $('#wa-pie').href   = waLink('¡Hola! 👋 Vengo de su página web. ¿Me apoyan con una cotización?');
    $('#wa-cta').href   = waLink(M_GENERAL);
    $('#wa-nohay').href = waLink('¡Hola! 👋 Busqué un producto en su tienda en línea y no lo encontré. ¿Lo manejan?');
    $('#wa-fab').href   = waLink(M_GENERAL);

    /* ─────────── MI CUENTA (SUPABASE AUTH + tbl_clientes) ─────────── */
    const LLAVE_SESION  = 'candy_sesion_v1';
    const LLAVE_ENTREGA = 'candy_entrega_v1';

    const API = {
      async iniciar({ correo, clave }) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: correo,
          password: clave
        });
        if (error) {
          if (/invalid login/i.test(error.message)) {
            throw new Error('Correo o contraseña incorrectos.');
          }
          if (/email not confirmed/i.test(error.message)) {
            throw new Error('Confirma tu correo electrónico antes de iniciar sesión.');
          }
          throw new Error(error.message);
        }

        const authUser = data.user;
        const { data: clienteDB } = await supabase
          .from('tbl_clientes')
          .select('*')
          .eq('id_cliente', authUser.id)
          .maybeSingle();

        if (clienteDB) {
          if (clienteDB.direccion_calle || clienteDB.sucursal_preferida) {
            guardarJSON(LLAVE_ENTREGA, {
              nombre: clienteDB.nombre_completo,
              correo: clienteDB.correo,
              tel: clienteDB.telefono || '',
              calle: clienteDB.direccion_calle || '',
              colonia: clienteDB.direccion_colonia || '',
              cp: clienteDB.direccion_cp || '',
              ref: clienteDB.direccion_referencias || '',
              sucursal: clienteDB.sucursal_preferida || ''
            });
          }
          return {
            id_cliente: clienteDB.id_cliente,
            nombre: clienteDB.nombre_completo,
            correo: clienteDB.correo,
            tel: clienteDB.telefono || ''
          };
        }

        const nombreFallback = authUser.user_metadata?.nombre_completo || correo.split('@')[0];
        const telFallback = authUser.user_metadata?.telefono || '';
        await supabase.from('tbl_clientes').upsert([{
          id_cliente: authUser.id,
          nombre_completo: nombreFallback,
          correo: authUser.email,
          telefono: telFallback
        }]);

        return {
          id_cliente: authUser.id,
          nombre: nombreFallback,
          correo: authUser.email,
          tel: telFallback
        };
      },

      async registrar({ nombre, correo, tel, clave, promos }) {
        const { data, error } = await supabase.auth.signUp({
          email: correo,
          password: clave,
          options: {
            data: {
              nombre_completo: nombre,
              telefono: tel,
              acepta_promos_wa: promos
            }
          }
        });
        if (error) {
          if (/already registered/i.test(error.message)) {
            throw new Error('Ese correo ya tiene una cuenta registrada. Inicia sesión.');
          }
          throw new Error(error.message);
        }

        if (data.user) {
          await supabase.from('tbl_clientes').upsert([{
            id_cliente: data.user.id,
            nombre_completo: nombre,
            correo,
            telefono: tel,
            acepta_promos_wa: Boolean(promos)
          }]);
        }

        return {
          id_cliente: data.user?.id || null,
          nombre,
          correo,
          tel
        };
      },

      async recuperar(correo) {
        const { error } = await supabase.auth.resetPasswordForEmail(correo, {
          redirectTo: window.location.origin
        });
        if (error) throw new Error(error.message);
      },

      async salir() {
        await supabase.auth.signOut();
      }
    };

    let usuario = (() => {
      const u = leerJSON(LLAVE_SESION, null);
      return u && u.nombre && u.correo ? u : null;
    })();

    const dlg = $('#cuenta');
    const VISTAS = {
      entrar:    { panel:'#form-entrar',    tabs:true,  t:'¡Qué gusto verte!',
                   s:'Entra y tus datos se llenan solos al pagar.' },
      crear:     { panel:'#form-crear',     tabs:true,  t:'Crea tu cuenta',
                   s:'Toma un minuto y ya no tendrás que escribir tus datos en cada compra.' },
      recuperar: { panel:'#form-recuperar', tabs:false, t:'Recupera tu contraseña',
                   s:'Escribe tu correo y te mandamos un enlace para crear una nueva.' },
      perfil:    { panel:'#cuenta-perfil',  tabs:false, t:'', s:'Esta es tu cuenta de Dulcerías Candy.' }
    };

    const primerNombre = n => String(n).trim().split(/\s+/)[0];
    const inicial      = n => String(n).trim().charAt(0).toUpperCase();
    const telBonito    = t => String(t).replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
    const soloDigitos  = v => String(v).replace(/\D/g, '');

    const REGLAS = {
      nombre: v => v.trim().length >= 2                           || 'Escribe tu nombre.',
      correo: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Revisa tu correo, parece incompleto.',
      tel:    v => /^\d{10}$/.test(soloDigitos(v))                || 'Escribe los 10 dígitos de tu celular.',
      clave:  v => v.length >= 8                                  || 'La contraseña necesita al menos 8 caracteres.'
    };
    const revisar = inp => { const r = REGLAS[inp.dataset.regla](inp.value); return r === true ? '' : r; };

    function marcar(inp, msg){
      inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
      const err = document.getElementById(inp.id + '-err');
      if (err) err.textContent = msg;
    }
    function limpiarErrores(form){
      $$('input[data-regla]', form).forEach(i => {
        i.removeAttribute('aria-invalid');
        const e = document.getElementById(i.id + '-err'); if (e) e.textContent = '';
      });
      const a = $('.cuenta__aviso', form);
      if (a){ a.hidden = true; a.textContent = ''; }
    }
    function validar(form){
      let primero = null;
      const datos = {};
      $$('input[data-regla]', form).forEach(inp => {
        if (inp.closest('[hidden]')) return;
        const msg = revisar(inp);
        marcar(inp, msg);
        datos[inp.name] = inp.value;
        if (msg && !primero) primero = inp;
      });
      if (primero){ primero.focus(); return null; }
      return datos;
    }

    async function conEspera(form, tarea){
      const btn = $('button[type="submit"]', form);
      const txt = btn.innerHTML;
      const aviso = $('.cuenta__aviso', form);
      btn.disabled = true;
      btn.innerHTML = `<span class="giro" aria-hidden="true"></span>${btn.dataset.cargando || 'Un momento…'}`;
      aviso.hidden = true;
      try{
        return { ok:true, valor: await tarea() };
      }catch(err){
        aviso.textContent = (err && err.message) || 'Algo salió mal. Intenta de nuevo.';
        aviso.hidden = false;
        return { ok:false };
      }finally{
        btn.disabled = false;
        btn.innerHTML = txt;
      }
    }

    function vistaCuenta(v){
      const cfg = VISTAS[v];
      Object.entries(VISTAS).forEach(([k, c]) => { $(c.panel).hidden = k !== v; });
      $('#cuenta-tabs').hidden = !cfg.tabs;
      $('#cuenta-nota').hidden = !cfg.tabs;
      $$('#cuenta-tabs [role="tab"]').forEach(b => {
        const on = b.dataset.vista === v;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
      });
      $('#cuenta-t').textContent   = v === 'perfil' ? `Hola, ${primerNombre(usuario.nombre)}` : cfg.t;
      $('#cuenta-sub').textContent = cfg.s;

      $$('form', dlg).forEach(limpiarErrores);
      if (v === 'recuperar'){ $('#recuperar-pasos').hidden = false; $('#recuperar-ok').hidden = true; }
      if (v === 'perfil') pintarPerfil();

      if (dlg.open && matchMedia('(pointer:fine)').matches){
        const primero = $(`${cfg.panel} input, ${cfg.panel} button`);
        if (primero) primero.focus();
      }
    }

    function abrirCuenta(v = 'entrar'){
      if (usuario) v = 'perfil';
      if (!dlg.open){ dlg.showModal(); document.body.style.overflow = 'hidden'; }
      vistaCuenta(v);
    }
    dlg.addEventListener('close', () => {
      if ($('#carrito').hidden) document.body.style.overflow = '';
    });

    function pintarPerfil(){
      $('#perfil-avatar').textContent = inicial(usuario.nombre);
      $('#perfil-nombre').textContent = usuario.nombre;
      $('#perfil-correo').textContent = usuario.correo;
      $('#perfil-tel').textContent    = usuario.tel ? telBonito(usuario.tel) : '—';
    }

    function pintarCuenta(){
      $('#cuenta-saludo').textContent = usuario ? `Hola, ${primerNombre(usuario.nombre)}` : 'Hola, inicia sesión';
      $('#cuenta-ico').toggleAttribute('hidden', !!usuario);
      $('#cuenta-avatar').hidden = !usuario;
      if (usuario) $('#cuenta-avatar').textContent = inicial(usuario.nombre);
      $('#abrir-cuenta').setAttribute('aria-label',
        usuario ? `Mi cuenta (${usuario.nombre})` : 'Iniciar sesión o crear cuenta');

      $('#carrito-cuenta').innerHTML = usuario
        ? `<span aria-hidden="true">👤</span> Pedido a nombre de <b>${escapar(usuario.nombre)}</b>`
        : `¿Tienes cuenta? <button type="button" class="link" data-abrir-cuenta>Inicia sesión</button> y tus datos se llenan solos al pagar.`;
    }

    function entrar(u, saludo){
      usuario = { id_cliente: u.id_cliente || null, nombre: u.nombre, correo: u.correo, tel: u.tel || '' };
      guardarJSON(LLAVE_SESION, usuario);
      pintarCuenta();
      dlg.close();
      avisar(saludo, '👋');
    }

    $('#abrir-cuenta').addEventListener('click', () => abrirCuenta());

    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-cerrar-cuenta]')){ dlg.close(); return; }
      const ver = e.target.closest('.ver-clave');
      if (ver){
        const inp = ver.previousElementSibling;
        const mostrar = inp.type === 'password';
        inp.type = mostrar ? 'text' : 'password';
        ver.textContent = mostrar ? 'Ocultar' : 'Ver';
        ver.setAttribute('aria-pressed', mostrar);
        ver.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Ver contraseña');
        return;
      }
      const v = e.target.closest('[data-vista]');
      if (v) vistaCuenta(v.dataset.vista);
    });

    $('#cuenta-tabs').addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const v = $('#tab-entrar').getAttribute('aria-selected') === 'true' ? 'crear' : 'entrar';
      vistaCuenta(v);
      $(`#cuenta-tabs [data-vista="${v}"]`).focus();
    });

    dlg.addEventListener('input', e => {
      const inp = e.target;
      if (inp.dataset.regla && inp.getAttribute('aria-invalid') === 'true' && !revisar(inp)) marcar(inp, '');
    });
    dlg.addEventListener('focusout', e => {
      const inp = e.target;
      if (inp.dataset && inp.dataset.regla && inp.value) marcar(inp, revisar(inp));
    });

    $('#form-entrar').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.currentTarget;
      const d = validar(f); if (!d) return;
      const r = await conEspera(f, () => API.iniciar({ correo: d.correo.trim(), clave: d.clave }));
      if (r.ok){ f.reset(); entrar(r.valor, `¡Hola de nuevo, ${primerNombre(r.valor.nombre)}!`); }
    });

    $('#form-crear').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.currentTarget;
      const d = validar(f); if (!d) return;
      const r = await conEspera(f, () => API.registrar({
        nombre: d.nombre.trim(),
        correo: d.correo.trim(),
        tel:    soloDigitos(d.tel),
        clave:  d.clave,
        promos: $('#c-promos').checked
      }));
      if (r.ok){ f.reset(); entrar(r.valor, `¡Bienvenido, ${primerNombre(r.valor.nombre)}! Tu cuenta está lista`); }
    });

    $('#form-recuperar').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.currentTarget;
      const d = validar(f); if (!d) return;
      const r = await conEspera(f, () => API.recuperar(d.correo.trim()));
      if (r.ok){
        $('#recuperar-correo').textContent = d.correo.trim();
        $('#recuperar-pasos').hidden = true;
        $('#recuperar-ok').hidden = false;
        f.reset();
      }
    });

    $('#perfil-pedido').addEventListener('click', () => { dlg.close(); abrirCarrito(); });
    $('#cerrar-sesion').addEventListener('click', async () => {
      await API.salir();
      usuario = null;
      try{ localStorage.removeItem(LLAVE_SESION); }catch(_){}
      pintarCuenta();
      dlg.close();
      avisar('Cerraste sesión. ¡Vuelve pronto!', '👋');
    });

    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;
      const { data: cli } = await supabase
        .from('tbl_clientes')
        .select('*')
        .eq('id_cliente', authData.user.id)
        .maybeSingle();
      if (cli) {
        usuario = {
          id_cliente: cli.id_cliente,
          nombre: cli.nombre_completo,
          correo: cli.correo,
          tel: cli.telefono || ''
        };
        guardarJSON(LLAVE_SESION, usuario);
        pintarCuenta();
      }
    })();

    /* ─────────── FINALIZAR COMPRA (tbl_pedidos y tbl_detalle_pedidos) ─────────── */
    const SUCURSALES = [
      { zona:'Central de Abasto', lista:['Corporativo Candy'] },
      { zona:'Centro Histórico',  lista:['12 Poniente 114, Junior','12 Poniente 119','8 Poniente 318',
                                         '10 Poniente 109','2 Norte y 8 Oriente','14 Poniente 310-B'] },
      { zona:'Sur de Puebla',     lista:['11 Sur 9515, Club de Golf'] }
    ];

    const DATOS_SPEI = {
      banco:        'Banco por definir',
      clabe:        '000 000 00000000000 0',
      beneficiario: 'Dulcerías Candy'
    };

    function marcaTarjeta(num){
      const n = soloDigitos(num);
      if (/^3[47]/.test(n))           return 'amex';
      if (/^4/.test(n))               return 'visa';
      if (/^(5[1-5]|2[2-7])/.test(n)) return 'mc';
      return '';
    }
    const NOMBRE_MARCA = { visa:'Visa', mc:'Mastercard', amex:'American Express' };

    function luhn(n){
      let suma = 0, doble = false;
      for (let i = n.length - 1; i >= 0; i--){
        let d = +n[i];
        if (doble){ d *= 2; if (d > 9) d -= 9; }
        suma += d; doble = !doble;
      }
      return suma % 10 === 0;
    }

    Object.assign(REGLAS, {
      cel:     v => /^\d{10}$/.test(soloDigitos(v)) || 'Escribe los 10 dígitos de tu celular.',
      calle:   v => v.trim().length >= 4            || 'Escribe la calle y el número.',
      colonia: v => v.trim().length >= 3            || 'Escribe la colonia.',
      cp: v => {
        const n = soloDigitos(v);
        if (n.length !== 5) return 'El código postal tiene 5 dígitos.';
        if (!/^72\d{3}$/.test(n)) return 'Por ahora solo enviamos dentro de Puebla. Puedes recoger en sucursal.';
        return true;
      },
      tarjeta: v => {
        const n = soloDigitos(v), m = marcaTarjeta(n);
        if (!m) return 'Aceptamos Visa, Mastercard y American Express.';
        if (n.length !== (m === 'amex' ? 15 : 16) || !luhn(n)) return 'Revisa el número de tu tarjeta.';
        return true;
      },
      titular: v => v.trim().length >= 3 || 'Escribe el nombre tal como aparece en la tarjeta.',
      venc: v => {
        const m = /^(\d{2})\/(\d{2})$/.exec(v.trim());
        if (!m || +m[1] < 1 || +m[1] > 12) return 'Usa el formato MM/AA.';
        const fin = new Date(2000 + +m[2], +m[1], 1);
        if (fin <= new Date()) return 'Esta tarjeta ya venció.';
        return true;
      },
      cvv: v => {
        const largo = marcaTarjeta($('#t-num').value) === 'amex' ? 4 : 3;
        return new RegExp(`^\\d{${largo}}$`).test(v) || `El CVV tiene ${largo} dígitos.`;
      }
    });

    // Regla de corte 4:30 PM (hora Puebla) para turno_surtido
    function calcularTurnoSurtido() {
      const partes = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date());
      const hora = Number(partes.find(p => p.type === 'hour')?.value || 0);
      const min  = Number(partes.find(p => p.type === 'minute')?.value || 0);
      return (hora > 16 || (hora === 16 && min >= 30)) ? 'siguiente_dia' : 'mismo_dia';
    }

    function generarFolioYQR() {
      const fecha = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()).replace(/-/g, '');
      const sufijo = Math.random().toString(36).substring(2, 6).toUpperCase();
      const tokenQR = Math.random().toString(36).substring(2, 8).toUpperCase();
      const folio = `CND-${fecha}-${sufijo}`;
      return { folio, codigo_qr: `QR-${folio}-${tokenQR}` };
    }

    async function enviarPedido({ cliente, metodo, resumen, tarjeta }) {
      const { folio, codigo_qr } = generarFolioYQR();
      const turno_surtido = calcularTurnoSurtido();

      const numLimpio = tarjeta ? soloDigitos(tarjeta.num) : '';
      const marca = tarjeta ? marcaTarjeta(numLimpio) : null;
      const ultimos = tarjeta ? numLimpio.slice(-4) : null;

      // 1. Insertar encabezado en tbl_pedidos
      const { data: pedidoCreado, error: errPedido } = await supabase
        .from('tbl_pedidos')
        .insert([{
          folio,
          codigo_qr,
          id_cliente: usuario?.id_cliente || null,
          cliente_nombre: cliente.nombre,
          cliente_correo: cliente.correo,
          cliente_telefono: cliente.tel,
          tipo_entrega: cliente.tipo,
          sucursal_recoleccion: cliente.tipo === 'sucursal' ? cliente.sucursal : null,
          direccion_calle: cliente.tipo === 'domicilio' ? cliente.calle : null,
          direccion_colonia: cliente.tipo === 'domicilio' ? cliente.colonia : null,
          direccion_cp: cliente.tipo === 'domicilio' ? cliente.cp : null,
          direccion_referencias: cliente.tipo === 'domicilio' ? (cliente.ref || null) : null,
          metodo_pago: metodo,
          estado_pago: metodo === 'tarjeta' ? 'pagado' : 'pendiente',
          tarjeta_marca: marca,
          tarjeta_ultimos4: ultimos,
          subtotal: resumen.subtotal,
          descuento_mayoreo: resumen.descuento,
          costo_envio: resumen.envio,
          total: resumen.aPagar,
          estado_pedido: 'recibido',
          turno_surtido
        }])
        .select('id_pedido, folio, codigo_qr')
        .single();

      if (errPedido) {
        throw new Error('No pudimos registrar tu pedido: ' + errPedido.message);
      }

      // 2. Insertar partidas en tbl_detalle_pedidos
      const filasDetalle = resumen.lineas.map(l => ({
        id_pedido: pedidoCreado.id_pedido,
        id_producto: l.p.id_db || null,
        codigo_barras: String(l.p.id),
        nombre_producto: l.p.nombre,
        presentacion: l.p.unidad || 'Pieza',
        cantidad: l.cant,
        precio_unitario: l.p.precio,
        aplica_descuento_5: l.aplica,
        descuento_linea: l.ahorro,
        subtotal_linea: l.neto,
        lote_asignado: null
      }));

      const { error: errDetalle } = await supabase
        .from('tbl_detalle_pedidos')
        .insert(filasDetalle);

      if (errDetalle) {
        throw new Error('Tu pedido se creó pero hubo un problema guardando el detalle: ' + errDetalle.message);
      }

      // 3. Si el cliente tiene cuenta activa, guardar su dirección/sucursal preferida en tbl_clientes
      if (usuario?.id_cliente) {
        await supabase
          .from('tbl_clientes')
          .update({
            telefono: cliente.tel,
            direccion_calle: cliente.tipo === 'domicilio' ? cliente.calle : undefined,
            direccion_colonia: cliente.tipo === 'domicilio' ? cliente.colonia : undefined,
            direccion_cp: cliente.tipo === 'domicilio' ? cliente.cp : undefined,
            direccion_referencias: cliente.tipo === 'domicilio' ? cliente.ref : undefined,
            sucursal_preferida: cliente.tipo === 'sucursal' ? cliente.sucursal : undefined
          })
          .eq('id_cliente', usuario.id_cliente);
      }

      return {
        folio: pedidoCreado.folio,
        codigo_qr: pedidoCreado.codigo_qr,
        turno_surtido,
        marca,
        ultimos
      };
    }

    const dlgPago = $('#pago');
    let entregaActual = null;

    const tipoEntrega = () => ($('input[name="entrega"]:checked', dlgPago) || {}).value || 'domicilio';
    const metodoPago  = () => ($('input[name="metodo"]:checked',  dlgPago) || {}).value || 'tarjeta';

    function cuentas(){
      const t = totales();
      const envio = tipoEntrega() === 'sucursal' ? 0 : CONFIG.costoEnvio;
      return { ...t, envio, aPagar: Number((t.total + envio).toFixed(2)) };
    }

    function pintarResumen(){
      const c = cuentas();
      $('#pr-lista').innerHTML = c.lineas.map(({p, cant, bruto, aplica, neto}) => `
        <li class="pr__item">
          <span class="pr__foto"><img src="${escapar(imgDe(p))}" alt="" loading="lazy" onerror="this.src='img/ICONO.png'"><b>${cant}</b></span>
          <span class="pr__n">${escapar(p.nombre)}<small>${escapar(p.unidad)}</small></span>
          <span class="pr__p">${dinero(aplica ? neto : bruto)}</span>
        </li>`).join('');
      $('#pr-n').textContent         = `(${c.piezas} ${c.piezas === 1 ? 'pieza' : 'piezas'})`;
      $('#pr-sub').textContent       = dinero(c.subtotal);
      $('#pr-off').textContent       = '−' + dinero(c.descuento);
      $('#pr-fila-off').hidden       = !c.hayDescuento;
      $('#pr-envio').textContent     = c.envio ? dinero(c.envio) : 'Gratis';
      $('#pr-envio').classList.toggle('gratis', !c.envio);
      $('#pr-total').textContent     = dinero(c.aPagar);
      $('#pr-total-sum').textContent = dinero(c.aPagar);
      $('#op-envio-txt').textContent = `${dinero(CONFIG.costoEnvio)} · ciudad de Puebla`;
      pintarBotonPago();
    }

    function pintarBotonPago(){
      const btn = $('#pago-btn');
      if (btn.disabled) return;
      btn.textContent = metodoPago() === 'tarjeta'
        ? `Pagar ${dinero(cuentas().aPagar)}`
        : 'Confirmar pedido';
    }

    function irPaso(n){
      $('#pago-entrega').hidden = n !== 1;
      $('#pago-metodo').hidden  = n !== 2;
      $('#pago-listo').hidden   = n !== 3;
      $('#pago-resumen').hidden = n === 3;
      dlgPago.classList.toggle('pago--listo', n === 3);
      $$('.pago__pasos li', dlgPago).forEach(li => {
        const p = +li.dataset.paso;
        li.classList.toggle('hecho', p < n);
        if (p === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      $('.pago__caja', dlgPago).scrollTop = 0;
      dlgPago.scrollTop = 0;
    }

    function pintarEntrega(){
      const suc = tipoEntrega() === 'sucursal';
      $('#bloque-domicilio').hidden = suc;
      $('#bloque-sucursal').hidden  = !suc;
      pintarResumen();
    }

    function pintarMetodo(){
      const m = metodoPago();
      $('#bloque-tarjeta').hidden = m !== 'tarjeta';
      $('#info-spei').hidden      = m !== 'spei';
      $('#info-efectivo').hidden  = m !== 'efectivo';
      pintarBotonPago();
    }

    function llenarSucursales(){
      $('#p-suc').innerHTML = SUCURSALES.map(g =>
        `<optgroup label="${escapar(g.zona)}">${g.lista.map(s =>
          `<option value="${escapar(s)}">${escapar(s)}</option>`).join('')}</optgroup>`).join('');
    }

    function precargar(){
      const guardado = leerJSON(LLAVE_ENTREGA, {}) || {};
      const datos = { ...guardado };
      if (usuario){
        datos.nombre = datos.nombre || usuario.nombre;
        datos.correo = datos.correo || usuario.correo;
        datos.tel    = datos.tel    || usuario.tel;
      }
      const f = $('#pago-entrega');
      ['nombre','correo','tel','calle','colonia','cp','ref'].forEach(k => {
        const inp = f.elements[k];
        if (inp && !inp.value && datos[k]) inp.value = datos[k];
      });
      if (datos.sucursal) f.elements.sucursal.value = datos.sucursal;
      if (datos.tipo){
        const r = $(`input[name="entrega"][value="${datos.tipo}"]`, f);
        if (r) r.checked = true;
      }
    }

    function abrirPago(){
      if (totales().piezas === 0){ avisar('Tu pedido está vacío', '🛒'); return; }
      precargar();
      $$('form', dlgPago).forEach(limpiarErrores);
      pintarEntrega();
      pintarMetodo();
      irPaso(1);
      $('#pago-resumen').open = matchMedia('(min-width: 861px)').matches;
      if (!dlgPago.open){ dlgPago.showModal(); document.body.style.overflow = 'hidden'; }
    }

    dlgPago.addEventListener('close', () => {
      if ($('#carrito').hidden) document.body.style.overflow = '';
      if (!$('#pago-listo').hidden) irPaso(1);
    });

    dlgPago.addEventListener('click', e => {
      if (e.target === dlgPago || e.target.closest('[data-cerrar-pago]')){
        if (!$('#pago-btn').disabled) dlgPago.close();
        return;
      }
      const ir = e.target.closest('[data-paso-ir]');
      if (ir) irPaso(+ir.dataset.pasoIr);
    });

    matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) $('#pago-resumen').open = true; });

    dlgPago.addEventListener('change', e => {
      if (e.target.name === 'entrega') pintarEntrega();
      if (e.target.name === 'metodo')  pintarMetodo();
    });

    dlgPago.addEventListener('input', e => {
      const inp = e.target;
      if (inp.dataset.regla && inp.getAttribute('aria-invalid') === 'true' && !revisar(inp)) marcar(inp, '');
    });
    dlgPago.addEventListener('focusout', e => {
      const inp = e.target;
      if (inp.dataset && inp.dataset.regla && inp.value) marcar(inp, revisar(inp));
    });

    $('#pago-entrega').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.currentTarget;
      const d = validar(f); if (!d) return;

      const tipo = tipoEntrega();
      entregaActual = {
        tipo,
        nombre: d.nombre.trim(), correo: d.correo.trim(), tel: soloDigitos(d.tel),
        calle: (d.calle||'').trim(), colonia: (d.colonia||'').trim(), cp: soloDigitos(d.cp||''),
        ref: f.elements.ref.value.trim(),
        sucursal: f.elements.sucursal.value
      };

      $('#pago-entrega-res').innerHTML = tipo === 'sucursal'
        ? `<span aria-hidden="true">🏪</span><div><small>Recoges en</small><b>Sucursal ${escapar(entregaActual.sucursal)}</b></div>`
        : `<span aria-hidden="true">🚚</span><div><small>Enviamos a</small><b>${escapar(entregaActual.calle)}, ${escapar(entregaActual.colonia)}, C.P. ${escapar(entregaActual.cp)}</b></div>`;
      $('#pago-entrega-res').insertAdjacentHTML('beforeend',
        '<button type="button" class="link" data-paso-ir="1">Cambiar</button>');

      const suc = tipo === 'sucursal';
      const efectivo = $('input[name="metodo"][value="efectivo"]', dlgPago);
      efectivo.disabled = !suc;
      if (!suc && efectivo.checked) $('input[name="metodo"][value="tarjeta"]', dlgPago).checked = true;
      $('#op-efectivo-s').textContent = suc
        ? 'Pagas en caja cuando pases por tu pedido'
        : 'Solo disponible si recoges en sucursal';
      $('#info-efectivo').textContent =
        `Apartamos tu pedido y lo pagas en la sucursal ${entregaActual.sucursal} al recogerlo.`;
      pintarMetodo();
      pintarResumen();
      irPaso(2);
    });

    const tNum = $('#t-num'), tNom = $('#t-nombre'), tVen = $('#t-venc'), tCvv = $('#t-cvv');

    function pintarTarjeta(){
      const n = soloDigitos(tNum.value), m = marcaTarjeta(n);
      const grupos = m === 'amex' ? [4,6,5] : [4,4,4,4];
      let i = 0;
      const visible = grupos.map(g => { const t = n.slice(i, i+g).padEnd(g, '•'); i += g; return t; }).join(' ');
      $('#tv-num').textContent    = visible;
      $('#tv-nombre').textContent = tNom.value.trim().toUpperCase() || 'TU NOMBRE';
      $('#tv-venc').textContent   = tVen.value || 'MM/AA';
      $('#tv-cvv').textContent    = tCvv.value.replace(/./g, '•') || (m === 'amex' ? '••••' : '•••');
      $('#tv-marca').textContent  = m ? (m === 'mc' ? '' : NOMBRE_MARCA[m].toUpperCase()) : '';
      $('#tv-marca').className    = 'tarjeta__marca' + (m ? ` tarjeta__marca--${m}` : '');
      $('#tarjeta-vista').dataset.marca = m;
      tCvv.placeholder = m === 'amex' ? '4 dígitos' : '3 dígitos';
    }

    tNum.addEventListener('input', () => {
      const n = soloDigitos(tNum.value).slice(0, 16);
      const amex = marcaTarjeta(n) === 'amex';
      const corte = amex ? [4,10] : [4,8,12];
      let txt = '';
      [...n.slice(0, amex ? 15 : 16)].forEach((d, i) => { if (corte.includes(i)) txt += ' '; txt += d; });
      tNum.value = txt;
      pintarTarjeta();
    });
    tVen.addEventListener('input', e => {
      let n = soloDigitos(tVen.value).slice(0, 4);
      if (n.length === 1 && +n > 1) n = '0' + n;
      tVen.value = n.length > 2 || (n.length === 2 && e.inputType !== 'deleteContentBackward')
        ? n.slice(0,2) + '/' + n.slice(2) : n;
      pintarTarjeta();
    });
    tCvv.addEventListener('input', () => { tCvv.value = soloDigitos(tCvv.value).slice(0, 4); pintarTarjeta(); });
    tNom.addEventListener('input', pintarTarjeta);
    tCvv.addEventListener('focus', () => $('#tarjeta-vista').classList.add('volteada'));
    tCvv.addEventListener('blur',  () => $('#tarjeta-vista').classList.remove('volteada'));

    $('#pago-metodo').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.currentTarget;
      const metodo = metodoPago();
      const d = validar(f); if (!d) return;
      const c = cuentas();

      const datos = {
        cliente: entregaActual,
        metodo,
        resumen: c,
        tarjeta: metodo === 'tarjeta' ? { num: d.num, titular: d.titular, venc: d.venc, cvv: d.cvv } : null
      };

      const r = await conEspera(f, () => enviarPedido(datos));

      [tNum, tNom, tVen, tCvv].forEach(i => { i.value = ''; i.removeAttribute('aria-invalid'); });
      pintarTarjeta();
      if (!r.ok){ pintarBotonPago(); return; }

      terminar(r.valor, metodo, c);
    });

    function terminar({ folio, codigo_qr, turno_surtido, marca, ultimos }, metodo, c){
      const ent = entregaActual;
      guardarJSON(LLAVE_ENTREGA, { ...ent });

      Object.keys(pedido).forEach(k => delete pedido[k]);
      guardarPedido();
      pintarCarrito();

      $('#listo-t').textContent = `¡Gracias, ${primerNombre(ent.nombre)}!`;
      $('#listo-folio').textContent = folio;

      let pagoHtml = '';
      if (metodo === 'tarjeta'){
        pagoHtml = `<p><span aria-hidden="true">💳</span><span>Cobramos <b>${dinero(c.aPagar)}</b> a tu ${escapar(NOMBRE_MARCA[marca] || 'tarjeta')}${ultimos ? ` terminación <b>${escapar(ultimos)}</b>` : ''}.</span></p>`;
      } else if (metodo === 'spei'){
        pagoHtml = `<div class="spei">
          <p class="spei__t">Transfiere <b>${dinero(c.aPagar)}</b> en las próximas 24 horas:</p>
          <dl>
            <div><dt>Banco</dt><dd>${escapar(DATOS_SPEI.banco)}</dd></div>
            <div><dt>CLABE</dt><dd><span id="spei-clabe">${escapar(DATOS_SPEI.clabe)}</span>
              <button type="button" class="link" id="copiar-clabe">Copiar</button></dd></div>
            <div><dt>Beneficiario</dt><dd>${escapar(DATOS_SPEI.beneficiario)}</dd></div>
            <div><dt>Concepto</dt><dd>${escapar(folio)}</dd></div>
          </dl></div>`;
      } else {
        pagoHtml = `<p><span aria-hidden="true">💵</span><span>Pagas <b>${dinero(c.aPagar)}</b> en efectivo al recoger en la sucursal.</span></p>`;
      }

      const entregaHtml = ent.tipo === 'sucursal'
        ? `<p><span aria-hidden="true">🏪</span><span>Recógelo en la sucursal <b>${escapar(ent.sucursal)}</b> presentando tu código de entrega <b>${escapar(codigo_qr)}</b>.</span></p>`
        : `<p><span aria-hidden="true">🚚</span><span>Lo llevamos a <b>${escapar(ent.calle)}, ${escapar(ent.colonia)}</b>.</span></p>`;

      const corteHtml = turno_surtido === 'siguiente_dia'
        ? `<p><span aria-hidden="true">🕓</span><span>Tu pedido entró después del corte de las <b>4:30 PM</b>, por lo que se surtirá a primera hora del <b>siguiente día hábil</b>.</span></p>`
        : `<p><span aria-hidden="true">⚡</span><span>Tu pedido entró antes del corte de las <b>4:30 PM</b> y ya está en cola de surtido de hoy.</span></p>`;

      $('#listo-detalle').innerHTML = pagoHtml + entregaHtml + corteHtml +
        `<p class="listo__correo">Te mandamos la confirmación a <b>${escapar(ent.correo)}</b>.</p>`;
      $('#listo-ayuda').href = waLink(`¡Hola! 👋 Tengo una duda con mi pedido ${folio}.`);

      irPaso(3);
      $('#pago-listo').focus();
    }

    dlgPago.addEventListener('click', e => {
      if (!e.target.closest('#copiar-clabe')) return;
      const clabe = soloDigitos($('#spei-clabe').textContent);
      navigator.clipboard?.writeText(clabe).then(() => avisar('CLABE copiada', '📋'), () => {});
    });

    /* ─────────── SINCRONIZACIÓN EN VIVO CON SUPABASE ─────────── */
    async function sincronizarConSupabase() {
      const ahora = new Date();

      const { data: prodsDB } = await supabase
        .from('tbl_productos')
        .select('*, tbl_categorias(slug)')
        .order('id_producto');

      if (prodsDB && prodsDB.length > 0) {
        const catalogoReconstruido = PRODUCTOS_BASE.map(item => ({ ...item }));
        const idsOcultosWeb = new Set();
        const nombresOcultosWeb = new Set();

        prodsDB.forEach(db => {
          const idProd = db.codigo_barras || String(db.id_producto);
          const nombreNorm = (db.nombre_dulce || '').trim().toLowerCase();

          // Ocultar en la tienda web si está dado de baja o en modo Borrador (Solo SIGE Candy)
          if (db.activo === false || db.publicado_web === false) {
            idsOcultosWeb.add(idProd);
            if (nombreNorm) nombresOcultosWeb.add(nombreNorm);
            return;
          }

          // Validar vigencia automática del descuento (corte 23:59)
          let descPct = Number(db.porcentaje_descuento || 0);
          if (descPct > 0) {
            const inicio = db.descuento_inicio ? new Date(db.descuento_inicio) : null;
            const fin = db.descuento_fin ? new Date(db.descuento_fin) : null;
            if ((inicio && ahora < inicio) || (fin && ahora > fin)) {
              descPct = 0;
            }
          }

          const precioBase = Number(db.precio_unitario || 0);
          const precioConDescuento = descPct > 0
            ? Number((precioBase * (1 - descPct / 100)).toFixed(2))
            : precioBase;
          const precioAntes = descPct > 0 ? precioBase : null;

          const idx = catalogoReconstruido.findIndex(
            p => p.id === idProd || p.nombre.toLowerCase() === nombreNorm
          );
          const piezasBase = idx >= 0 ? catalogoReconstruido[idx].piezas : 0;

          const marcaLimpia =
            db.marca && db.marca !== 'Sin marca / Genérico'
              ? db.marca
              : '';

          const etiquetaReal =
            db.etiqueta_web && db.etiqueta_web !== 'normal'
              ? db.etiqueta_web
              : null;

          const itemMapeado = {
            id_db: db.id_producto,
            id: idProd,
            nombre: db.nombre_dulce,
            marca: marcaLimpia,
            unidad: db.presentacion || 'Pieza',
            precio: precioConDescuento,
            antes: precioAntes,
            descuentoPct: descPct,
            cat: db.tbl_categorias?.slug || 'gomitas',
            etiqueta: etiquetaReal,
            piezas: Number(db.piezas_por_paquete) > 0 ? Number(db.piezas_por_paquete) : piezasBase,
            stock: db.stock_web,
            tope: db.tope_maximo_compra || 20,
            es_transaccional: db.es_transaccional,
            img: db.imagen_url || null,
            desc: db.descripcion || ''
          };

          if (idx >= 0) {
            catalogoReconstruido[idx] = {
              ...catalogoReconstruido[idx],
              ...itemMapeado,
              desc: itemMapeado.desc || catalogoReconstruido[idx].desc || ''
            };
          } else {
            catalogoReconstruido.unshift(itemMapeado);
          }
        });

        PRODUCTOS = catalogoReconstruido.filter(
          p => !idsOcultosWeb.has(String(p.id)) && !nombresOcultosWeb.has(p.nombre.toLowerCase())
        );
      }

      const { data: bannersDB } = await supabase
        .from('tbl_promociones_banners')
        .select('*')
        .eq('estado', 'Activo')
        .order('id_promocion');

      if (bannersDB) {
        const bannersVigentes = bannersDB.filter(b => {
          const inicio = b.fecha_inicio ? new Date(b.fecha_inicio) : null;
          const fin = b.fecha_expiracion ? new Date(b.fecha_expiracion) : null;
          if (inicio && ahora < inicio) return false;
          if (fin && ahora > fin) return false;
          return true;
        });

        if (bannersVigentes.length > 0) {
          BANNERS = bannersVigentes.map((b, i) => {
            const partes = (b.leyenda_exclusividad || '').split('|').map(s => s.trim());
            const destinoGuardado = partes[2] || (b.imagen_banner_url?.startsWith('#') ? b.imagen_banner_url : '#catalogo');
            return {
              clase: `banner--${(i % 3) + 1}`,
              tag: partes[0] || 'Promoción',
              titulo: b.titulo,
              texto: partes[1] || b.leyenda_exclusividad || '',
              cta: 'Ver promoción',
              destino: destinoGuardado,
              imagen_banner_url: b.imagen_banner_url || ''
            };
          });
        } else {
          BANNERS = [...BANNERS_RESPALDO];
        }
      }

      if (banner >= BANNERS.length) banner = 0;

      pintarBanners();
      pintarRubros();
      pintarEstantes();
      pintarDulces();
      pintarCatalogo();
      pintarCarrito();
      pintarPinata();

      const m = location.hash.match(/^#\/producto\/(.+)$/);
      if (m) {
        const prodAbierto = PRODUCTOS.find(x => String(x.id) === String(m[1]));
        if (prodAbierto) {
          pintarFicha(prodAbierto);
        } else {
          location.hash = '#/';
        }
      }
    }

    /* ─────────── ARRANQUE INICIAL ─────────── */
    llenarSucursales();
    pintarTarjeta();
    pintarCatnav();
    pintarRubros();
    pintarBanners();
    irBanner(0);
    autoBanner();
    pintarEstantes();
    pintarMarcas();
    cargarPedido();
    pintarCarrito();
    pintarCuenta();

    try{
      const g = JSON.parse(localStorage.getItem(LLAVE_PINATA)||'{}');
      Object.entries(g).forEach(([id,c])=>{ if(PRODUCTOS.some(p=>p.id===id)&&c>0) pinata[id]=c; });
      const gb = JSON.parse(localStorage.getItem(LLAVE_BOLSA)||'{}');
      Object.entries(gb.items||{}).forEach(([id,c])=>{ const p=PRODUCTOS.find(x=>x.id===id); if(p&&sirveParaBolsa(p)&&c>0) bolsa[id]=c; });
      if(gb.n>0) nBolsas = Math.min(1000, Math.round(gb.n));
      modo = localStorage.getItem(LLAVE_MODO)==='bolsa' ? 'bolsa' : 'pinata';
    }catch(_){}
    cambiarModo(modo);

    pintarCatalogo();
    router();

    sincronizarRef.current = sincronizarConSupabase;
    sincronizarConSupabase();
  }, []);

  // Canal Realtime independiente (no se bloquea con React Strict Mode)
  useEffect(() => {
    const supabase = createClient();

    const dispararSync = () => {
      if (sincronizarRef.current) sincronizarRef.current();
    };

    const canalRealtime = supabase
      .channel('cambios-erp-tienda')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_productos' }, () => dispararSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_promociones_banners' }, () => dispararSync())
      .subscribe((status) => {
        console.log('[TiendaCandy Realtime]:', status);
      });

    const verificadorVigenciaTimer = setInterval(dispararSync, 30000);
    const alVolverAPestana = () => {
      if (document.visibilityState === 'visible') dispararSync();
    };
    document.addEventListener('visibilitychange', alVolverAPestana);

    return () => {
      clearInterval(verificadorVigenciaTimer);
      document.removeEventListener('visibilitychange', alVolverAPestana);
      supabase.removeChannel(canalRealtime);
    };
  }, []);

  return (
    <>
      <a className="skip" href="#principal">Saltar al contenido</a>

      {/* CINTA DE AVISOS */}
      <div className="cinta" aria-label="Avisos de la tienda">
        <div className="cinta__pista">
          <div className="cinta__grupo">
            <span><b>Envío a domicilio</b> en la ciudad de Puebla</span><i aria-hidden="true">✳</i>
            <span><b>5% de descuento</b> desde 5 piezas del mismo producto</span><i aria-hidden="true">✳</i>
            <span><b>Paga con tarjeta</b>, transferencia o efectivo</span><i aria-hidden="true">✳</i>
            <span><b>12 sucursales</b> en Puebla</span><i aria-hidden="true">✳</i>
            <span>Surtimos tu negocio, tu fiesta y tu piñata</span><i aria-hidden="true">✳</i>
            <span><b>Desde 1974</b> endulzando Puebla</span><i aria-hidden="true">✳</i>
          </div>
          <div className="cinta__grupo" aria-hidden="true">
            <span><b>Envío a domicilio</b> en la ciudad de Puebla</span><i>✳</i>
            <span><b>5% de descuento</b> desde 5 piezas del mismo producto</span><i>✳</i>
            <span><b>Paga con tarjeta</b>, transferencia o efectivo</span><i>✳</i>
            <span><b>12 sucursales</b> en Puebla</span><i>✳</i>
            <span>Surtimos tu negocio, tu fiesta y tu piñata</span><i>✳</i>
            <span><b>Desde 1974</b> endulzando Puebla</span><i>✳</i>
          </div>
        </div>
      </div>

      {/* ENCABEZADO */}
      <header className="head">
        <div className="head__in">
          <a
            href="#/"
            className="logo"
            aria-label="Dulcerías Candy, inicio"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="img/LOGO CANDY.png"
              alt="Dulcerías Candy"
              onError={(e) => { e.currentTarget.src = 'img/ICONO.png'; }}
            />
          </a>

          <div className="buscador">
            <form className="buscador__caja" id="form-busqueda" role="search">
              <label className="sr" htmlFor="q">Buscar productos</label>
              <input
                type="search"
                id="q"
                placeholder="Buscar gomitas, chocolates, mazapán, piñatas…"
                autoComplete="off"
                role="combobox"
                aria-expanded="false"
                aria-controls="sugerencias"
                aria-autocomplete="list"
              />
              <button type="submit" className="buscador__btn" aria-label="Buscar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 105.3 14l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></svg>
              </button>
            </form>
            <div className="sug" id="sugerencias" role="listbox" aria-label="Sugerencias"></div>
          </div>

          <div className="head__acc">
            <a className="acc" id="wa-head" href="#" target="_blank" rel="noopener">
              <svg className="ico-wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.488"/></svg>
              <span className="acc__txt"><small>¿Dudas?</small><b>Escríbenos</b></span>
            </a>

            <button className="acc" id="abrir-cuenta" aria-haspopup="dialog" aria-label="Iniciar sesión o crear cuenta">
              <svg className="ico-user" id="cuenta-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.24-8 5v3h16v-3c0-2.76-3.6-5-8-5z"/></svg>
              <span className="acc__avatar" id="cuenta-avatar" aria-hidden="true" hidden></span>
              <span className="acc__txt"><small id="cuenta-saludo">Hola, inicia sesión</small><b>Mi cuenta</b></span>
            </button>

            <button className="acc acc--cart" id="abrir-carrito">
              <span className="acc__ico" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 4h-3v2h2l2.6 8.6a2 2 0 001.9 1.4h7.4a2 2 0 001.9-1.4L22 8H7.3L7 4zm2.5 15a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>
                <b className="acc__n" id="cart-n">0</b>
              </span>
              <span className="acc__txt"><small>Mi pedido</small><b id="cart-total-head">$0.00</b></span>
            </button>

            <button className="burger" id="burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="catnav">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>

      <nav className="catnav" id="catnav" aria-label="Categorías">
        <div className="catnav__in" id="catnav-links"></div>
      </nav>

      <main id="principal">
        <div id="vista-tienda">
          <section className="portada" aria-label="Promociones">
            <div className="banners">
              <div className="banners__viewport" id="banners"></div>
              <button className="banners__nav banners__nav--prev" id="banner-prev" aria-label="Anterior">‹</button>
              <button className="banners__nav banners__nav--next" id="banner-next" aria-label="Siguiente">›</button>
              <div className="banners__dots" id="banner-dots"></div>
            </div>
          </section>

          <div className="banda banda--crema">
            <section className="marcas" aria-label="Marcas que manejamos">
              <p className="marcas__t">Manejamos las mejores marcas</p>
              <div className="marcas__viewport"><div className="marcas__pista" id="marcas"></div></div>
            </section>

            <section className="estante" aria-labelledby="e1">
              <div className="estante__head">
                <h2 id="e1">Los más vendidos</h2>
                <button className="link" data-ir-cat="todos">Ver todo</button>
              </div>
              <div className="estante__wrap">
                <button className="estante__nav estante__nav--prev" data-scroll="e-top" data-dir="-1" aria-label="Anterior">‹</button>
                <div className="estante__pista" id="e-top"></div>
                <button className="estante__nav estante__nav--next" data-scroll="e-top" data-dir="1" aria-label="Siguiente">›</button>
              </div>
            </section>
          </div>

          <div className="banda banda--lavanda">
            <section className="pasos" id="como-comprar">
              <div className="centrado">
                <p className="antetitulo"><span aria-hidden="true">🛍️</span> Sin complicaciones</p><br />
                <h2 className="titulo">Comprar aquí es fácil</h2>
                <p className="subtitulo">Cuatro pasos y tu pedido queda pagado y apartado.</p>
              </div>
              <ol className="pasos__lista">
                <li className="paso" data-n="1" style={{ '--c': '#EC008C' }}>
                  <span className="paso__n">1</span><span className="paso__ico" aria-hidden="true">🔎</span>
                  <h3>Busca lo que necesitas</h3><p>Usa el buscador de arriba o filtra por categoría y precio.</p>
                </li>
                <li className="paso" data-n="2" style={{ '--c': '#0085CA' }}>
                  <span className="paso__n">2</span><span className="paso__ico" aria-hidden="true">🛒</span>
                  <h3>Agrégalo a tu pedido</h3><p>Ajusta cantidades. Desde 5 piezas del mismo producto baja 5%.</p>
                </li>
                <li className="paso" data-n="3" style={{ '--c': '#00A650' }}>
                  <span className="paso__n">3</span><span className="paso__ico" aria-hidden="true">💳</span>
                  <h3>Paga seguro</h3><p>Con tarjeta de crédito o débito, transferencia SPEI o efectivo al recoger.</p>
                </li>
                <li className="paso" data-n="4" style={{ '--c': '#F7941D' }}>
                  <span className="paso__n">4</span><span className="paso__ico" aria-hidden="true">📦</span>
                  <h3>Recibe o recoge</h3><p>Te lo llevamos a casa en Puebla o lo recoges en cualquiera de nuestras 8 sucursales de entrega.</p>
                </li>
              </ol>
            </section>

            <section className="rubros">
              <div className="centrado">
                <p className="antetitulo"><span aria-hidden="true">🍭</span> Elige tu antojo</p><br />
                <h2 className="titulo">Compra por categoría</h2>
                <p className="subtitulo">Toca una categoría y el catálogo de abajo se filtra solo.</p>
              </div>
              <div className="rubros__in" id="rubros"></div>
            </section>
          </div>

          <div className="banda banda--blanca">
            <section className="tienda" id="catalogo">
              <nav className="migas" aria-label="Ubicación">
                <a href="#/">Inicio</a><span aria-hidden="true">›</span><span id="migas-cat">Todos los productos</span>
              </nav>

              <div className="tienda__grid">
                <aside className="filtros" id="filtros">
                  <button className="filtros__cerrar" id="filtros-cerrar" aria-label="Cerrar filtros">✕</button>
                  <div className="fbloque"><h3>Categorías</h3><ul id="f-cats"></ul></div>
                  <div className="fbloque"><h3>Precio</h3><ul id="f-precio"></ul></div>
                  <div className="fbloque">
                    <h3>Opciones</h3>
                    <label className="fcheck"><input type="checkbox" id="f-oferta" /><span>Solo con descuento</span></label>
                    <label className="fcheck"><input type="checkbox" id="f-nuevo" /><span>Solo novedades</span></label>
                  </div>
                  <button className="btn btn--fantasma btn--bloque" id="f-limpiar">Limpiar filtros</button>
                </aside>

                <div className="resultados">
                  <div className="barra">
                    <p className="barra__n" id="conteo" role="status"></p>
                    <div className="barra__acc">
                      <button className="btn btn--fantasma btn--sm" id="abrir-filtros">Filtros</button>
                      <label className="orden">
                        <span className="sr">Ordenar por</span>
                        <select id="orden">
                          <option value="relevancia">Más relevantes</option>
                          <option value="menor">Menor precio</option>
                          <option value="mayor">Mayor precio</option>
                          <option value="nombre">Nombre A-Z</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="chips" id="chips-activos"></div>
                  <div className="rejilla" id="rejilla"></div>

                  <div className="vacio" id="vacio" hidden>
                    <p className="vacio__ico" aria-hidden="true">🔍</p>
                    <h3>No encontramos ese producto</h3>
                    <p>Manejamos más de mil productos en tienda y no todos están en línea todavía.</p>
                    <a className="btn btn--wa" id="wa-nohay" href="#" target="_blank" rel="noopener">Preguntar por WhatsApp</a>
                  </div>

                  <nav className="paginas" id="paginas" aria-label="Páginas de resultados"></nav>
                </div>
              </div>
            </section>

            <section className="estante" aria-labelledby="e2">
              <div className="estante__head">
                <h2 id="e2">Con descuento esta semana</h2>
                <button className="link" data-ir-oferta="1">Ver todo</button>
              </div>
              <div className="estante__wrap">
                <button className="estante__nav estante__nav--prev" data-scroll="e-off" data-dir="-1" aria-label="Anterior">‹</button>
                <div className="estante__pista" id="e-off"></div>
                <button className="estante__nav estante__nav--next" data-scroll="e-off" data-dir="1" aria-label="Siguiente">›</button>
              </div>
            </section>
          </div>

          {/* BANDA MENTA: PIÑATA + AGUINALDOS + GARANTÍAS + SUCURSALES + FAQ */}
          <div className="banda banda--menta">
            <section className="pinata" id="pinata">
              <div className="pinata__in">
                <div className="pinata__lado">
                  <p className="etiqueta">Herramienta gratis</p>

                  <div className="modos" role="group" aria-label="¿Qué quieres llenar?">
                    <button type="button" className="modo" data-modo="pinata" aria-pressed="true"><span aria-hidden="true">🪅</span> Piñata</button>
                    <button type="button" className="modo" data-modo="bolsa" aria-pressed="false"><span aria-hidden="true">🎁</span> Aguinaldos</button>
                  </div>

                  <h2 id="pinata-titulo">Llena tu piñata</h2>
                  <p className="pinata__txt" id="pinata-txt">
                    Toca dulces y míralos caer dentro. Cuando quedes conforme, pásalo a tu pedido o cómpralo de una vez.
                  </p>

                  <div className="pinata__escena">
                    <img
                      src="img/PIÑATA.png"
                      alt="Piñata de estrella"
                      id="pinata-img"
                      className="pinata__obj"
                      width="220"
                      height="220"
                      onError={(e) => { e.currentTarget.src = 'img/Fiesta.png'; }}
                    />

                    <svg className="pinata__obj bolsa" id="bolsa-img" viewBox="0 0 200 240" role="img" aria-label="Bolsita de aguinaldo" hidden>
                      <defs>
                        <clipPath id="bolsa-forma">
                          <path d="M72 78C58 98 30 116 28 164C26 206 44 228 100 228C156 228 174 206 172 164C170 116 142 98 128 78Z"/>
                        </clipPath>
                        <pattern id="confites" width="34" height="30" patternUnits="userSpaceOnUse">
                          <rect width="34" height="30" fill="#FFD9EC"/>
                          <circle cx="7" cy="7" r="6" fill="#EC008C"/>
                          <circle cx="24" cy="10" r="5" fill="#FEDD00"/>
                          <rect x="12" y="17" width="12" height="8" rx="3" fill="#0085CA"/>
                          <circle cx="30" cy="25" r="5" fill="#00A650"/>
                          <circle cx="5" cy="24" r="4" fill="#F04E23"/>
                        </pattern>
                      </defs>
                      <path d="M72 80L52 18L74 36L86 10L100 32L114 10L126 36L148 18L128 80Z"
                            fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.85)" strokeWidth="2.5" strokeLinejoin="round"/>
                      <g clipPath="url(#bolsa-forma)">
                        <rect id="bolsa-relleno" x="0" y="78" width="200" height="152" fill="url(#confites)"/>
                      </g>
                      <path d="M72 78C58 98 30 116 28 164C26 206 44 228 100 228C156 228 174 206 172 164C170 116 142 98 128 78Z"
                            fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.9)" strokeWidth="3"/>
                      <path d="M50 130C42 150 42 180 52 202" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="5" strokeLinecap="round"/>
                      <path d="M100 80C82 62 60 66 66 82C72 96 92 86 100 80Z" fill="#E4002B"/>
                      <path d="M100 80C118 62 140 66 134 82C128 96 108 86 100 80Z" fill="#E4002B"/>
                      <path d="M96 84L84 116L92 112L96 120Z M104 84L116 116L108 112L104 120Z" fill="#B8001F"/>
                      <rect x="64" y="74" width="72" height="10" rx="5" fill="#E4002B"/>
                      <circle cx="100" cy="80" r="8" fill="#FEDD00"/>
                    </svg>

                    <span className="pinata__n" id="pinata-n" aria-hidden="true">0</span>
                  </div>

                  <p className="pinata__estado" id="pinata-estado" role="status">Todavía está vacía</p>
                  <div className="pinata__barra"><i id="pinata-fill"></i></div>

                  <div className="cuantas" id="bolsa-cuantas" hidden>
                    <label htmlFor="bolsa-n">¿Cuántas bolsitas vas a armar?</label>
                    <div className="cuantas__ctl">
                      <button type="button" data-bolsas="-5" aria-label="Cinco bolsitas menos">−</button>
                      <input type="number" id="bolsa-n" min="1" max="1000" defaultValue={20} inputMode="numeric" />
                      <button type="button" data-bolsas="5" aria-label="Cinco bolsitas más">+</button>
                    </div>
                  </div>

                  <ul className="pinata__lista" id="pinata-lista"></ul>
                  <p className="pinata__resumen" id="bolsa-resumen" hidden></p>

                  <div className="pinata__cta">
                    <button type="button" className="btn btn--primario" id="pinata-add" disabled>Pasar a mi pedido</button>
                    <button type="button" className="btn btn--amarillo" id="pinata-comprar" disabled>Comprar ahora</button>
                  </div>
                  <button type="button" className="link link--tenue" id="pinata-vaciar" hidden>Vaciar la piñata</button>
                </div>

                <div className="pinata__lado">
                  <p className="etiqueta" id="dulces-tip">Toca un dulce para echarlo</p>
                  <div className="dulces" id="dulces"></div>
                </div>
              </div>
            </section>

            <section className="garantias" aria-label="Por qué comprarnos">
              <div className="garantias__in">
                <div className="gar" style={{ '--c': '#00A650' }}><span aria-hidden="true">🚚</span><b>Envío a domicilio</b><small>Dentro de la ciudad de Puebla</small></div>
                <div className="gar" style={{ '--c': '#EC008C' }}><span aria-hidden="true">🏷️</span><b>5% desde 5 piezas</b><small>Por producto, sin monto mínimo</small></div>
                <div className="gar" style={{ '--c': '#0085CA' }}><span aria-hidden="true">🏪</span><b>12 sucursales</b><small>8 para recoger tu pedido</small></div>
                <div className="gar" style={{ '--c': '#F7941D' }}><span aria-hidden="true">🔒</span><b>Pago seguro</b><small>Tarjeta, SPEI o efectivo</small></div>
              </div>
            </section>

            <section className="sucursales" id="sucursales">
              <div className="centrado">
                <p className="antetitulo"><span aria-hidden="true">📍</span> Cerca de ti</p><br />
                <h2 className="titulo">Dónde estamos</h2>
                <p className="subtitulo">Doce sucursales en Puebla. Todas surten menudeo y mayoreo.</p>
              </div>
              <div className="sucursales__grid">
                <article className="suc">
                  <div className="suc__mapa">
                    <iframe src="https://www.google.com/maps/d/embed?mid=1KMS5gdyd6QrzdtKlLMFcFz3vwW3DQwwE" loading="lazy" title="Sucursales en Central de Abasto" referrerPolicy="no-referrer-when-downgrade"></iframe>
                  </div>
                  <div className="suc__cuerpo">
                    <h3>Central de Abasto</h3>
                    <ul><li>Matriz</li><li>Azúcar</li><li>Chocolate</li><li>Central de Abasto</li><li>Corporativo Candy</li></ul>
                  </div>
                </article>
                <article className="suc">
                  <div className="suc__mapa">
                    <iframe src="https://www.google.com/maps/d/u/0/embed?mid=1DnJ98G6ABRwZpBWsYC3aYUXNx4j0Z2Kv" loading="lazy" title="Sucursales en Centro Histórico" referrerPolicy="no-referrer-when-downgrade"></iframe>
                  </div>
                  <div className="suc__cuerpo">
                    <h3>Centro Histórico</h3>
                    <ul>
                      <li>12 Poniente 114, Junior</li><li>12 Poniente 119</li><li>8 Poniente 318</li>
                      <li>10 Poniente 109</li><li>2 Norte y 8 Oriente</li>
                      <li>14 Poniente 310-B <span className="nueva">Nueva</span></li>
                    </ul>
                  </div>
                </article>
                <article className="suc">
                  <div className="suc__mapa">
                    <iframe src="https://www.google.com/maps/d/embed?mid=1xMw3fhrslNzi7KTvOSpyIG870di8y420" loading="lazy" title="Sucursal Sur de Puebla" referrerPolicy="no-referrer-when-downgrade"></iframe>
                  </div>
                  <div className="suc__cuerpo">
                    <h3>Sur de Puebla</h3>
                    <ul><li>11 Sur 9515, Club de Golf</li></ul>
                  </div>
                </article>
              </div>
            </section>

            <section className="faq" id="preguntas">
              <div className="centrado">
                <p className="antetitulo"><span aria-hidden="true">💡</span> Dudas comunes</p><br />
                <h2 className="titulo">Preguntas frecuentes</h2>
              </div>
              <div className="faq__lista">
                <article className="qa">
                  <h3><button className="qa__q" aria-expanded="false">¿Cómo funciona el descuento del 5%?<span className="qa__i" aria-hidden="true">+</span></button></h3>
                  <div className="qa__a"><p>Se aplica producto por producto, no sobre el total: si llevas 5 o más piezas del mismo producto, esa línea baja 5%. Puedes tener unos productos con descuento y otros sin él en el mismo pedido.</p></div>
                </article>
                <article className="qa">
                  <h3><button className="qa__q" aria-expanded="false">¿Hacen envíos?<span className="qa__i" aria-hidden="true">+</span></button></h3>
                  <div className="qa__a"><p>Sí, dentro de la ciudad de Puebla. El envío cuesta $59 sin importar el monto de tu compra y lo ves en el total antes de pagar. Si prefieres, recoge gratis en sucursal. Por ahora el envío a domicilio es solo dentro de la ciudad; si estás fuera, recoge en sucursal o escríbenos.</p></div>
                </article>
                <article className="qa">
                  <h3><button className="qa__q" aria-expanded="false">¿Cómo puedo pagar?<span className="qa__i" aria-hidden="true">+</span></button></h3>
                  <div className="qa__a"><p>Al finalizar tu compra eliges: tarjeta de crédito o débito (Visa, Mastercard o American Express), transferencia SPEI, o efectivo en la sucursal al recoger tu pedido. El efectivo no está disponible para envíos a domicilio.</p></div>
                </article>
                <article className="qa">
                  <h3><button className="qa__q" aria-expanded="false">¿Es seguro pagar con tarjeta?<span className="qa__i" aria-hidden="true">+</span></button></h3>
                  <div className="qa__a"><p>Sí. El cobro lo procesa una plataforma de pagos certificada y los datos de tu tarjeta viajan cifrados directo a ella: nosotros nunca vemos ni guardamos el número completo.</p></div>
                </article>
                <article className="qa">
                  <h3><button className="qa__q" aria-expanded="false">¿Con cuánto tiempo debo pedir?<span className="qa__i" aria-hidden="true">+</span></button></h3>
                  <div className="qa__a"><p>De 24 a 48 horas antes si necesitas envío o es pedido grande para evento. Pedidos chicos para recoger en sucursal casi siempre salen el mismo día.</p></div>
                </article>
                <article className="qa">
                  <h3><button className="qa__q" aria-expanded="false">¿Arman paquetes para piñata?<span className="qa__i" aria-hidden="true">+</span></button></h3>
                  <div className="qa__a"><p>Sí, y también bolsitas de aguinaldo. Usa la herramienta &ldquo;Llena tu piñata&rdquo; de esta página (tiene modo para aguinaldos) o dinos cuántos niños y qué presupuesto traes, y te armamos el surtido.</p></div>
                </article>
              </div>
            </section>
          </div>
        </div>

        <div id="vista-producto" hidden></div>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="pie">
        <div className="pie__cta">
          <div className="pie__cta-in">
            <div><h2>¿Ya sabes qué quieres?</h2><p>Compra en línea y paga con tarjeta, o escríbenos si tienes dudas.</p></div>
            <div className="pie__cta-btns">
              <a className="btn btn--amarillo" href="#catalogo">Ver el catálogo</a>
              <a className="btn btn--wa" id="wa-cta" href="#" target="_blank" rel="noopener">Escríbenos</a>
            </div>
          </div>
        </div>

        <div className="pie__in">
          <div className="pie__col pie__col--marca">
            <span className="pie__logo">
              <img src="img/LOGO CANDY.png" alt="Dulcerías Candy" onError={(e) => { e.currentTarget.src = 'img/ICONO.png'; }} />
            </span>
            <p>Dulces, chocolates y artículos de fiesta en Puebla desde 1974. Surtimos tu negocio, tu fiesta y tu piñata.</p>
            <p className="pie__rotulo">Síguenos</p>
            <div className="pie__redes">
              <a href="https://www.facebook.com/DulceriaCandy" target="_blank" rel="noopener" aria-label="Facebook">
                <img src="img/facebook.png" alt="" /><span>Facebook</span>
              </a>
              <a href="https://www.instagram.com/dulcerias_candy/" target="_blank" rel="noopener" aria-label="Instagram">
                <img src="img/instagram.png" alt="" /><span>Instagram</span>
              </a>
              <a href="https://www.tiktok.com/@dulceriacandyoficial" target="_blank" rel="noopener" aria-label="TikTok">
                <img src="img/tiktok.png" alt="" /><span>TikTok</span>
              </a>
            </div>
          </div>

          <div className="pie__col"><h4>Comprar</h4><div id="pie-cats"></div></div>

          <div className="pie__col">
            <h4>Ayuda</h4>
            <a href="#como-comprar">Cómo comprar</a>
            <a href="#preguntas">Preguntas frecuentes</a>
            <a href="#sucursales">Sucursales y horarios</a>
            <a href="#pinata">Piñata y aguinaldos</a>
          </div>

          <div className="pie__col">
            <h4>Contacto</h4>
            <a id="wa-pie" href="#" target="_blank" rel="noopener" className="pie__tel">
              <b>221 434 9590</b><small>WhatsApp y teléfono</small>
            </a>
            <p className="pie__horario"><b>Lunes a sábado</b>9:00 a 19:00</p>
            <p className="pie__horario"><b>Domingo</b>9:00 a 19:00</p>
            <p className="pie__rotulo">Formas de pago</p>
            <span className="marcas-pago" aria-label="Visa, Mastercard, American Express y SPEI">
              <span className="mp mp--visa" aria-hidden="true">VISA</span>
              <span className="mp mp--mc" aria-hidden="true"><i></i><i></i></span>
              <span className="mp mp--amex" aria-hidden="true">AMEX</span>
              <span className="mp mp--spei" aria-hidden="true">SPEI</span>
            </span>
          </div>
        </div>

        <div className="pie__pago">
          <span>Formas de pago</span>
          <b>Efectivo</b><b>Transferencia SPEI</b><b>Tarjeta</b>
          <span className="pie__pago-sep"></span>
          <span>Entrega</span>
          <b>Envío en Puebla</b><b>Recoge en 8 sucursales</b>
        </div>

        <p className="pie__legal">
          © 2026 Dulcerías Candy · Puebla, México · Hecho con mucha azúcar ·{' '}
          <a href="/login" style={{ color: '#FEDD00', fontWeight: 700, marginLeft: 8 }}>
            🔒 Acceso Personal (SIGE Candy)
          </a>
        </p>
      </footer>

      {/* BARRA MÓVIL */}
      <div className="movil" id="movil" hidden>
        <div><b id="movil-n">0 productos</b><span id="movil-total">$0.00</span></div>
        <button className="btn btn--primario btn--sm" id="movil-abrir">Ver pedido</button>
      </div>

      {/* CARRITO */}
      <div className="velo" id="velo" hidden></div>

      <aside className="carrito" id="carrito" role="dialog" aria-modal="true" aria-labelledby="carrito-t" hidden>
        <header className="carrito__head">
          <h2 id="carrito-t">Tu pedido</h2>
          <button className="cerrar" id="carrito-cerrar" aria-label="Cerrar">✕</button>
        </header>
        <div className="carrito__cuerpo">
          <ul className="carrito__lista" id="carrito-lista"></ul>
          <div className="carrito__vacio" id="carrito-vacio">
            <p aria-hidden="true">🛒</p>
            <h3>Tu pedido está vacío</h3>
            <p>Agrega productos del catálogo y aparecerán aquí.</p>
            <button className="btn btn--primario" id="carrito-ir">Ver el catálogo</button>
          </div>
        </div>
        <footer className="carrito__pie">
          <div className="fila"><span>Productos</span><span id="c-sub">$0.00</span></div>
          <div className="fila fila--off" id="fila-off" hidden><span>Descuento 5%</span><span id="c-off">−$0.00</span></div>
          <div className="fila fila--total"><span>Total</span><span id="c-total">$0.00</span></div>
          <p className="carrito__nota">Envío a domicilio o recoger gratis en sucursal: lo eliges en el siguiente paso.</p>
          <p className="carrito__cuenta" id="carrito-cuenta"></p>
          <button className="btn btn--primario btn--bloque btn--pagar" id="pagar" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3z"/></svg>
            Ir a pagar
          </button>
          <div className="carrito__pagos">
            <span className="marcas-pago" aria-label="Visa, Mastercard, American Express y SPEI">
              <span className="mp mp--visa" aria-hidden="true">VISA</span>
              <span className="mp mp--mc" aria-hidden="true"><i></i><i></i></span>
              <span className="mp mp--amex" aria-hidden="true">AMEX</span>
              <span className="mp mp--spei" aria-hidden="true">SPEI</span>
            </span>
            <small>o efectivo al recoger</small>
          </div>
        </footer>
      </aside>

      <a className="fab" id="wa-fab" href="#" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.488"/></svg>
        <span className="fab__globo">¿Dudas? Escríbenos</span>
      </a>

      <div className="avisos" id="avisos" aria-live="polite"></div>

      {/* ══════════ MODAL: MI CUENTA (SUPABASE AUTH + tbl_clientes) ══════════ */}
      <dialog className="cuenta" id="cuenta" aria-labelledby="cuenta-t">
        <div className="cuenta__caja">
          <button type="button" className="cerrar cuenta__cerrar" data-cerrar-cuenta aria-label="Cerrar">✕</button>

          <aside className="cuenta__lado">
            <img className="cuenta__dulce cuenta__dulce--1" src="img/Gomita.png" alt="" aria-hidden="true" />
            <img className="cuenta__dulce cuenta__dulce--2" src="img/Paleta.png" alt="" aria-hidden="true" />
            <img className="cuenta__dulce cuenta__dulce--3" src="img/Chocolate.png" alt="" aria-hidden="true" />
            <img className="cuenta__dulce cuenta__dulce--4" src="img/Caramelo.png" alt="" aria-hidden="true" />

            <img
              className="cuenta__logo"
              src="img/LOGO CANDY.png"
              alt="Dulcerías Candy"
              onError={(e) => { e.currentTarget.src = 'img/ICONO.png'; }}
            />
            <p className="cuenta__lema">Tu cuenta <span>más dulce</span></p>
            <ul className="cuenta__beneficios">
              <li><span aria-hidden="true">⚡</span>Pide más rápido: tus datos van solos en cada pedido</li>
              <li><span aria-hidden="true">💳</span>Paga en segundos con tarjeta o transferencia</li>
              <li><span aria-hidden="true">🎁</span>Entérate primero de promociones y temporada de aguinaldos</li>
            </ul>
          </aside>

          <div className="cuenta__cuerpo">
            <h2 className="cuenta__t" id="cuenta-t">¡Qué gusto verte!</h2>
            <p className="cuenta__sub" id="cuenta-sub"></p>

            <div className="cuenta__tabs" id="cuenta-tabs" role="tablist" aria-label="Acceso">
              <button type="button" role="tab" id="tab-entrar" data-vista="entrar" aria-controls="form-entrar" aria-selected="true">Iniciar sesión</button>
              <button type="button" role="tab" id="tab-crear"  data-vista="crear"  aria-controls="form-crear"  aria-selected="false" tabIndex={-1}>Crear cuenta</button>
            </div>

            <form className="cuenta__form" id="form-entrar" role="tabpanel" aria-labelledby="tab-entrar" noValidate>
              <p className="cuenta__aviso" role="alert" hidden></p>

              <div className="campo">
                <label htmlFor="e-correo">Correo electrónico</label>
                <input id="e-correo" name="correo" type="email" autoComplete="email" inputMode="email"
                       placeholder="tucorreo@ejemplo.com" data-regla="correo" aria-describedby="e-correo-err" />
                <p className="campo__err" id="e-correo-err"></p>
              </div>

              <div className="campo">
                <label htmlFor="e-clave">Contraseña</label>
                <div className="campo__clave">
                  <input id="e-clave" name="clave" type="password" autoComplete="current-password"
                         data-regla="clave" aria-describedby="e-clave-err" />
                  <button type="button" className="ver-clave" aria-label="Ver contraseña" aria-pressed="false">Ver</button>
                </div>
                <p className="campo__err" id="e-clave-err"></p>
              </div>

              <div className="cuenta__fila">
                <button type="button" className="link" data-vista="recuperar">¿Olvidaste tu contraseña?</button>
              </div>

              <button type="submit" className="btn btn--primario btn--bloque" data-cargando="Entrando…">Entrar</button>
            </form>

            <form className="cuenta__form" id="form-crear" role="tabpanel" aria-labelledby="tab-crear" noValidate hidden>
              <p className="cuenta__aviso" role="alert" hidden></p>

              <div className="campo">
                <label htmlFor="c-nombre">Nombre completo</label>
                <input id="c-nombre" name="nombre" type="text" autoComplete="name"
                       placeholder="¿Cómo te llamas?" data-regla="nombre" aria-describedby="c-nombre-err" />
                <p className="campo__err" id="c-nombre-err"></p>
              </div>

              <div className="campo">
                <label htmlFor="c-correo">Correo electrónico</label>
                <input id="c-correo" name="correo" type="email" autoComplete="email" inputMode="email"
                       placeholder="tucorreo@ejemplo.com" data-regla="correo" aria-describedby="c-correo-err" />
                <p className="campo__err" id="c-correo-err"></p>
              </div>

              <div className="campo">
                <label htmlFor="c-tel">Celular</label>
                <input id="c-tel" name="tel" type="tel" autoComplete="tel-national" inputMode="numeric"
                       placeholder="10 dígitos" maxLength={14} data-regla="tel" aria-describedby="c-tel-ayuda c-tel-err" />
                <p className="campo__ayuda" id="c-tel-ayuda">Por si necesitamos avisarte algo de tu entrega.</p>
                <p className="campo__err" id="c-tel-err"></p>
              </div>

              <div className="campo">
                <label htmlFor="c-clave">Contraseña</label>
                <div className="campo__clave">
                  <input id="c-clave" name="clave" type="password" autoComplete="new-password"
                         data-regla="clave" aria-describedby="c-clave-ayuda c-clave-err" />
                  <button type="button" className="ver-clave" aria-label="Ver contraseña" aria-pressed="false">Ver</button>
                </div>
                <p className="campo__ayuda" id="c-clave-ayuda">Mínimo 8 caracteres.</p>
                <p className="campo__err" id="c-clave-err"></p>
              </div>

              <label className="fcheck cuenta__check"><input type="checkbox" id="c-promos" name="promos" /><span>Quiero recibir promociones por WhatsApp</span></label>

              <button type="submit" className="btn btn--primario btn--bloque" data-cargando="Creando tu cuenta…">Crear mi cuenta</button>
            </form>

            <form className="cuenta__form" id="form-recuperar" noValidate hidden>
              <p className="cuenta__aviso" role="alert" hidden></p>

              <div id="recuperar-pasos">
                <div className="campo">
                  <label htmlFor="r-correo">Correo electrónico</label>
                  <input id="r-correo" name="correo" type="email" autoComplete="email" inputMode="email"
                         placeholder="tucorreo@ejemplo.com" data-regla="correo" aria-describedby="r-correo-err" />
                  <p className="campo__err" id="r-correo-err"></p>
                </div>
                <button type="submit" className="btn btn--primario btn--bloque" data-cargando="Enviando…">Mandar enlace</button>
              </div>

              <div className="cuenta__ok" id="recuperar-ok" role="status" hidden>
                <b>Revisa tu correo</b>
                Si <span id="recuperar-correo"></span> tiene una cuenta, te llegará un enlace para crear una contraseña nueva.
              </div>

              <button type="button" className="link cuenta__volver" data-vista="entrar">‹ Volver a iniciar sesión</button>
            </form>

            <div id="cuenta-perfil" hidden>
              <div className="perfil">
                <span className="perfil__avatar" id="perfil-avatar" aria-hidden="true"></span>
                <dl className="perfil__datos">
                  <div><dt>Nombre</dt><dd id="perfil-nombre"></dd></div>
                  <div><dt>Correo</dt><dd id="perfil-correo"></dd></div>
                  <div><dt>Celular</dt><dd id="perfil-tel"></dd></div>
                </dl>
              </div>
              <p className="cuenta__ok">Tus datos se llenan solos cada vez que pagues un pedido.</p>
              <div className="cuenta__acciones">
                <button type="button" className="btn btn--primario btn--bloque" id="perfil-pedido">Ver mi pedido</button>
                <button type="button" className="btn btn--fantasma btn--bloque" id="cerrar-sesion">Cerrar sesión</button>
              </div>
            </div>

            <p className="cuenta__nota" id="cuenta-nota">No necesitas cuenta para comprar: también puedes pagar como invitado.</p>
          </div>
        </div>
      </dialog>

      {/* ══════════ MODAL: FINALIZAR COMPRA (3 PASOS -> tbl_pedidos / tbl_detalle_pedidos) ══════════ */}
      <dialog className="pago" id="pago" aria-labelledby="pago-t">
        <div className="pago__caja">
          <header className="pago__head">
            <img
              src="img/LOGO CANDY.png"
              alt="Dulcerías Candy"
              className="pago__logo"
              onError={(e) => { e.currentTarget.src = 'img/ICONO.png'; }}
            />
            <div>
              <h2 id="pago-t">Finalizar compra</h2>
              <span className="pago__seguro">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3z"/></svg>
                Pago seguro y cifrado
              </span>
            </div>
            <button type="button" className="cerrar pago__cerrar" data-cerrar-pago aria-label="Cerrar">✕</button>
          </header>

          <ol className="pago__pasos" aria-label="Pasos de la compra">
            <li data-paso="1" aria-current="step"><b>1</b><span>Entrega</span></li>
            <li data-paso="2"><b>2</b><span>Pago</span></li>
            <li data-paso="3"><b>3</b><span>¡Listo!</span></li>
          </ol>

          <div className="pago__grid">
            <details className="pago__resumen" id="pago-resumen">
              <summary><span>Tu pedido <small id="pr-n"></small></span><b id="pr-total-sum"></b></summary>
              <ul className="pr__lista" id="pr-lista"></ul>
              <div className="pr__filas">
                <div className="fila"><span>Productos</span><span id="pr-sub"></span></div>
                <div className="fila fila--off" id="pr-fila-off" hidden><span>Descuento 5%</span><span id="pr-off"></span></div>
                <div className="fila"><span>Envío</span><span id="pr-envio"></span></div>
                <div className="fila fila--total"><span>Total</span><span id="pr-total"></span></div>
              </div>
            </details>

            <div className="pago__main">
              {/* Paso 1: Entrega */}
              <form className="pago__form" id="pago-entrega" noValidate>
                <p className="cuenta__aviso" role="alert" hidden></p>

                <fieldset className="pago__bloque">
                  <legend>¿Cómo quieres recibirlo?</legend>
                  <div className="opciones">
                    <label className="opcion">
                      <input type="radio" name="entrega" value="domicilio" defaultChecked />
                      <span className="opcion__ico" aria-hidden="true">🚚</span>
                      <span className="opcion__txt"><b>Envío a domicilio</b><small id="op-envio-txt">Ciudad de Puebla</small></span>
                    </label>
                    <label className="opcion">
                      <input type="radio" name="entrega" value="sucursal" />
                      <span className="opcion__ico" aria-hidden="true">🏪</span>
                      <span className="opcion__txt"><b>Recoger en sucursal</b><small>Gratis · 8 sucursales</small></span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="pago__bloque">
                  <legend>Tus datos</legend>
                  <div className="campo">
                    <label htmlFor="p-nombre">Nombre completo</label>
                    <input id="p-nombre" name="nombre" type="text" autoComplete="name" data-regla="nombre" aria-describedby="p-nombre-err" />
                    <p className="campo__err" id="p-nombre-err"></p>
                  </div>
                  <div className="campos2">
                    <div className="campo">
                      <label htmlFor="p-correo">Correo</label>
                      <input id="p-correo" name="correo" type="email" autoComplete="email" inputMode="email" placeholder="Ahí te llega tu comprobante" data-regla="correo" aria-describedby="p-correo-err" />
                      <p className="campo__err" id="p-correo-err"></p>
                    </div>
                    <div className="campo">
                      <label htmlFor="p-tel">Celular</label>
                      <input id="p-tel" name="tel" type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="10 dígitos" maxLength={14} data-regla="cel" aria-describedby="p-tel-err" />
                      <p className="campo__err" id="p-tel-err"></p>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="pago__bloque" id="bloque-domicilio">
                  <legend>Dirección de entrega</legend>
                  <div className="campo">
                    <label htmlFor="p-calle">Calle y número</label>
                    <input id="p-calle" name="calle" type="text" autoComplete="address-line1" placeholder="Ej. 5 de Mayo 1204, int. 3" data-regla="calle" aria-describedby="p-calle-err" />
                    <p className="campo__err" id="p-calle-err"></p>
                  </div>
                  <div className="campos2">
                    <div className="campo">
                      <label htmlFor="p-colonia">Colonia</label>
                      <input id="p-colonia" name="colonia" type="text" autoComplete="address-level3" data-regla="colonia" aria-describedby="p-colonia-err" />
                      <p className="campo__err" id="p-colonia-err"></p>
                    </div>
                    <div className="campo">
                      <label htmlFor="p-cp">Código postal</label>
                      <input id="p-cp" name="cp" type="text" autoComplete="postal-code" inputMode="numeric" maxLength={5} placeholder="72000" data-regla="cp" aria-describedby="p-cp-err" />
                      <p className="campo__err" id="p-cp-err"></p>
                    </div>
                  </div>
                  <div className="campo">
                    <label htmlFor="p-ref">Referencias <span className="opc">(opcional)</span></label>
                    <input id="p-ref" name="ref" type="text" placeholder="Portón verde, entre calles…" />
                  </div>
                </fieldset>

                <fieldset className="pago__bloque" id="bloque-sucursal" hidden>
                  <legend>Sucursal</legend>
                  <div className="campo">
                    <label htmlFor="p-suc">¿En cuál lo recoges?</label>
                    <select id="p-suc" name="sucursal"></select>
                    <p className="campo__ayuda">Te avisamos por correo cuando esté listo, normalmente el mismo día.</p>
                  </div>
                </fieldset>

                <button type="submit" className="btn btn--primario btn--bloque btn--grande">Continuar al pago</button>
              </form>

              {/* Paso 2: Pago */}
              <form className="pago__form" id="pago-metodo" noValidate hidden>
                <p className="cuenta__aviso" role="alert" hidden></p>

                <div className="pago__entrega-res" id="pago-entrega-res"></div>

                <fieldset className="pago__bloque">
                  <legend>¿Cómo quieres pagar?</legend>
                  <div className="opciones opciones--lista">
                    <label className="opcion">
                      <input type="radio" name="metodo" value="tarjeta" defaultChecked />
                      <span className="opcion__ico" aria-hidden="true">💳</span>
                      <span className="opcion__txt"><b>Tarjeta de crédito o débito</b><small>Visa, Mastercard y American Express</small></span>
                      <span className="marcas-pago marcas-pago--mini" aria-hidden="true"><span className="mp mp--visa">VISA</span><span className="mp mp--mc"><i></i><i></i></span><span className="mp mp--amex">AMEX</span></span>
                    </label>
                    <label className="opcion">
                      <input type="radio" name="metodo" value="spei" />
                      <span className="opcion__ico" aria-hidden="true">🏦</span>
                      <span className="opcion__txt"><b>Transferencia SPEI</b><small>Te damos la CLABE y apartamos tu pedido 24 horas</small></span>
                    </label>
                    <label className="opcion">
                      <input type="radio" name="metodo" value="efectivo" />
                      <span className="opcion__ico" aria-hidden="true">💵</span>
                      <span className="opcion__txt"><b id="op-efectivo-t">Efectivo en tienda</b><small id="op-efectivo-s">Pagas en caja cuando pases por tu pedido</small></span>
                    </label>
                  </div>
                </fieldset>

                <div className="tarjeta-bloque" id="bloque-tarjeta">
                  <div className="tarjeta" id="tarjeta-vista" aria-hidden="true">
                    <div className="tarjeta__cara tarjeta__frente">
                      <div className="tarjeta__top"><span className="tarjeta__chip"></span><span className="tarjeta__marca" id="tv-marca"></span></div>
                      <div className="tarjeta__num" id="tv-num">•••• •••• •••• ••••</div>
                      <div className="tarjeta__pie">
                        <div><small>Titular</small><span id="tv-nombre">TU NOMBRE</span></div>
                        <div><small>Vence</small><span id="tv-venc">MM/AA</span></div>
                      </div>
                    </div>
                    <div className="tarjeta__cara tarjeta__reverso">
                      <div className="tarjeta__banda"></div>
                      <div className="tarjeta__firma"><span id="tv-cvv">•••</span></div>
                    </div>
                  </div>

                  <div className="campo">
                    <label htmlFor="t-num">Número de tarjeta</label>
                    <input id="t-num" name="num" type="text" autoComplete="cc-number" inputMode="numeric" placeholder="1234 5678 9012 3456" maxLength={23} data-regla="tarjeta" aria-describedby="t-num-err" />
                    <p className="campo__err" id="t-num-err"></p>
                  </div>
                  <div className="campo">
                    <label htmlFor="t-nombre">Nombre como aparece en la tarjeta</label>
                    <input id="t-nombre" name="titular" type="text" autoComplete="cc-name" data-regla="titular" aria-describedby="t-nombre-err" />
                    <p className="campo__err" id="t-nombre-err"></p>
                  </div>
                  <div className="campos2">
                    <div className="campo">
                      <label htmlFor="t-venc">Vencimiento</label>
                      <input id="t-venc" name="venc" type="text" autoComplete="cc-exp" inputMode="numeric" placeholder="MM/AA" maxLength={5} data-regla="venc" aria-describedby="t-venc-err" />
                      <p className="campo__err" id="t-venc-err"></p>
                    </div>
                    <div className="campo">
                      <label htmlFor="t-cvv">CVV</label>
                      <input id="t-cvv" name="cvv" type="password" autoComplete="cc-csc" inputMode="numeric" placeholder="3 dígitos" maxLength={4} data-regla="cvv" aria-describedby="t-cvv-err" />
                      <p className="campo__err" id="t-cvv-err"></p>
                    </div>
                  </div>
                </div>

                <div className="pago__info" id="info-spei" hidden>
                  Al confirmar te mostramos la CLABE y la referencia. Tu pedido queda apartado 24 horas y lo preparamos en cuanto se refleje el pago.
                </div>
                <div className="pago__info" id="info-efectivo" hidden></div>

                <button type="submit" className="btn btn--primario btn--bloque btn--grande" id="pago-btn" data-cargando="Procesando pago…">Pagar</button>
                <button type="button" className="link cuenta__volver" data-paso-ir="1">‹ Cambiar datos de entrega</button>
              </form>

              {/* Paso 3: ¡Listo! */}
              <div className="pago__listo" id="pago-listo" hidden tabIndex={-1}>
                <div className="listo__ico" aria-hidden="true">
                  <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>
                </div>
                <h3 id="listo-t">¡Gracias por tu compra!</h3>
                <p className="listo__folio">Pedido <b id="listo-folio"></b></p>
                <div className="listo__detalle" id="listo-detalle"></div>
                <button type="button" className="btn btn--primario btn--bloque btn--grande" data-cerrar-pago>Seguir comprando</button>
                <a className="link listo__ayuda" id="listo-ayuda" href="#" target="_blank" rel="noopener">¿Dudas con tu pedido? Escríbenos</a>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TiendaCandy() {
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    const supabase = createClient();

    const CONFIG = {
      whatsapp: '522214349590',
      envioGratisDesde: 399,
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

    // Catálogo base de respaldo de Leo + Sincronización con Supabase
    let PRODUCTOS = [
      {id:'gom-01',nombre:'Ositos de goma frutales',unidad:'Bolsa 1 kg',precio:85,antes:99,cat:'gomitas',etiqueta:'top',piezas:200,stock:50,tope:20,desc:'Gomitas suaves de cinco sabores. Las que nunca fallan en una piñata ni en el mostrador.'},
      {id:'gom-02',nombre:'Gusanos ácidos surtidos',unidad:'Bolsa 500 g',precio:45,cat:'gomitas',piezas:70,stock:40,tope:20,desc:'Azúcar ácida por fuera, gomita por dentro. Favoritos de quienes ya se cansaron del dulce simple.'},
      {id:'gom-03',nombre:'Tiburones de goma',unidad:'Bolsa 1 kg',precio:85,cat:'gomitas',piezas:120,stock:30,tope:20,desc:'Clásico azul y blanco. Se venden solos en bolsitas de fiesta infantil.'},
      {id:'gom-04',nombre:'Aros de manzana verde',unidad:'Bolsa 500 g',precio:48,cat:'gomitas',piezas:90,stock:30,tope:20,desc:'Aros de gomita con azúcar. El que más rota de toda la línea.'},
      {id:'gom-05',nombre:'Gomitas de panditas',unidad:'Bolsa 1 kg',precio:88,cat:'gomitas',piezas:210,stock:40,tope:20,desc:'Los ositos de siempre, en presentación de kilo para fiesta.'},
      {id:'gom-06',nombre:'Bocaditos de fruta',unidad:'Bolsa 500 g',precio:52,cat:'gomitas',etiqueta:'nuevo',piezas:80,stock:25,tope:20,desc:'Gomita con relleno suave de fruta. Presentación nueva en la casa.'},
      {id:'gom-07',nombre:'Lombrices de gomita',unidad:'Bolsa 1 kg',precio:82,antes:95,cat:'gomitas',piezas:130,stock:35,tope:20,desc:'Largas y de dos colores. Rinden mucho para bolsitas.'},
      {id:'gom-08',nombre:'Dientes y labios de goma',unidad:'Bolsa 500 g',precio:49,cat:'gomitas',piezas:75,stock:20,tope:20,desc:'Formas divertidas, sabor frutal. Muy pedidas para fiestas temáticas.'},
      {id:'cho-01',nombre:'Trufas surtidas de chocolate',unidad:'Caja 500 g',precio:120,cat:'chocolates',piezas:40,stock:25,tope:20,desc:'Trufas en cuatro rellenos. Buena opción para mesa de dulces o regalo.'},
      {id:'cho-02',nombre:'Monedas de chocolate doradas',unidad:'Bolsa 50 piezas',precio:90,antes:105,cat:'chocolates',etiqueta:'top',piezas:50,stock:35,tope:20,desc:'Envueltas en dorado. Salen muchísimo en diciembre y en fiestas temáticas.'},
      {id:'cho-03',nombre:'Cacahuates cubiertos de chocolate',unidad:'Bolsa 500 g',precio:95,cat:'chocolates',piezas:150,stock:30,tope:20,desc:'Cacahuate tostado bañado en chocolate. Se vende por peso o ya en bolsita.'},
      {id:'cho-04',nombre:'Malvaviscos cubiertos',unidad:'Bolsa 400 g',precio:78,cat:'chocolates',piezas:45,stock:25,tope:20,desc:'Malvavisco suave con capa de chocolate. Ideal para mesa de postres.'},
      {id:'cho-05',nombre:'Bombones de chocolate relleno',unidad:'Caja 24 piezas',precio:145,cat:'chocolates',piezas:24,stock:20,tope:20,desc:'Rellenos de avellana, fresa y caramelo. Presentación para regalo.'},
      {id:'cho-06',nombre:'Chocolate con arroz inflado',unidad:'Bolsa 500 g',precio:88,cat:'chocolates',piezas:60,stock:30,tope:20,desc:'Crujiente por dentro. De los que más gustan a los niños.'},
      {id:'cho-07',nombre:'Pasas cubiertas de chocolate',unidad:'Bolsa 500 g',precio:92,cat:'chocolates',etiqueta:'nuevo',piezas:180,stock:25,tope:20,desc:'Pasa entera con cobertura. Para quien busca algo menos empalagoso.'},
      {id:'cho-08',nombre:'Barras de chocolate de leche',unidad:'Caja 20 piezas',precio:130,antes:150,cat:'chocolates',piezas:20,stock:25,tope:20,desc:'Barras individuales para reventa o para llenar bolsitas grandes.'},
      {id:'car-01',nombre:'Dulces de leche quemada',unidad:'Bolsa 1 kg',precio:110,cat:'caramelos',piezas:90,stock:30,tope:20,desc:'Caramelo suave estilo tradicional. El sabor que reconoce cualquier abuelita.'},
      {id:'car-02',nombre:'Caramelos rellenos de fresa',unidad:'Bolsa 1 kg',precio:105,cat:'caramelos',etiqueta:'top',piezas:160,stock:60,tope:20,desc:'Duro por fuera, relleno líquido de fresa. De los más pedidos por mayoreo.'},
      {id:'car-03',nombre:'Mazapán de cacahuate',unidad:'Caja 30 piezas',precio:98,antes:112,cat:'caramelos',piezas:30,stock:45,tope:20,desc:'Mazapán clásico mexicano. Se deshace en la boca y se vende todo el año.'},
      {id:'car-04',nombre:'Bombones de menta envueltos',unidad:'Bolsa 500 g',precio:52,cat:'caramelos',piezas:110,stock:30,tope:20,desc:'Menta suave envuelta individualmente. Los típicos para caja registradora.'},
      {id:'car-05',nombre:'Caramelo macizo surtido',unidad:'Bolsa 1 kg',precio:78,cat:'caramelos',piezas:200,stock:40,tope:20,desc:'Sabores surtidos en envoltura de colores. El relleno más económico por pieza.'},
      {id:'car-06',nombre:'Obleas rellenas de cajeta',unidad:'Paquete 24 piezas',precio:96,cat:'caramelos',piezas:24,stock:25,tope:20,desc:'Oblea tradicional con cajeta de leche. Muy pedidas en escuelas.'},
      {id:'car-07',nombre:'Cocadas de coco',unidad:'Caja 20 piezas',precio:86,cat:'caramelos',piezas:20,stock:20,tope:20,desc:'Dulce tradicional de coco rallado. Se agota en temporada de feria.'},
      {id:'car-08',nombre:'Palanquetas de cacahuate',unidad:'Caja 25 piezas',precio:105,cat:'caramelos',etiqueta:'nuevo',piezas:25,stock:25,tope:20,desc:'Cacahuate con miel en barra. Clásico mexicano que nunca pasa de moda.'},
      {id:'pal-01',nombre:'Paletas espiral arcoíris',unidad:'Paquete 20 piezas',precio:65,antes:78,cat:'paletas',etiqueta:'top',piezas:20,stock:30,tope:20,desc:'Paletas grandes de colores. Además de dulce, funcionan como decoración de mesa.'},
      {id:'pal-02',nombre:'Paletas de caramelo macizo',unidad:'Bolsa 40 piezas',precio:58,cat:'paletas',piezas:40,stock:35,tope:20,desc:'Sabores surtidos, tamaño estándar. Las de siempre para bolsita de piñata.'},
      {id:'pal-03',nombre:'Paletas de bombón cubierto',unidad:'Paquete 12 piezas',precio:72,cat:'paletas',etiqueta:'nuevo',piezas:12,stock:20,tope:20,desc:'Bombón en palito con cobertura y chispas. Se ven muy bien en mesa de dulces.'},
      {id:'pal-04',nombre:'Paletas de payaso con chocolate',unidad:'Paquete 24 piezas',precio:88,cat:'paletas',piezas:24,stock:25,tope:20,desc:'Paleta de malvavisco con carita. Favorita para fiestas de niños chicos.'},
      {id:'pal-05',nombre:'Paletas de caramelo con chicle',unidad:'Bolsa 40 piezas',precio:62,cat:'paletas',piezas:40,stock:30,tope:20,desc:'Paleta con centro de chicle. Dura el doble que una paleta normal.'},
      {id:'pal-06',nombre:'Paletas corazón de fresa',unidad:'Paquete 24 piezas',precio:70,cat:'paletas',piezas:24,stock:25,tope:20,desc:'Forma de corazón, sabor fresa. Se disparan en febrero.'},
      {id:'pal-07',nombre:'Paletas gigantes de colores',unidad:'Paquete 6 piezas',precio:96,cat:'paletas',piezas:6,stock:15,tope:20,desc:'Paletas de 15 cm. Más para decorar la mesa que para comer.'},
      {id:'enc-01',nombre:'Tamarindo enchilado',unidad:'Bolsa 500 g',precio:68,cat:'enchilados',piezas:50,stock:35,tope:20,desc:'Pulpa de tamarindo con chile. El equilibrio dulce, ácido y picoso de siempre.'},
      {id:'enc-02',nombre:'Gomitas enchiladas surtidas',unidad:'Bolsa 1 kg',precio:92,antes:108,cat:'enchilados',etiqueta:'top',piezas:120,stock:55,tope:20,desc:'Gomitas con chile en polvo. La categoría que más ha crecido en el último año.'},
      {id:'enc-03',nombre:'Cacahuates japoneses enchilados',unidad:'Bolsa 500 g',precio:56,cat:'enchilados',piezas:60,stock:30,tope:20,desc:'Botana crujiente con chile. Se pide mucho junto con las bebidas.'},
      {id:'enc-04',nombre:'Polvo de chile con limón',unidad:'Bote 250 g',precio:38,cat:'enchilados',piezas:0,stock:40,tope:20,desc:'Para fruta, dulces o botana. Muchos lo llevan junto con las gomitas.'},
      {id:'enc-05',nombre:'Pulpa de tamarindo en vaso',unidad:'Caja 20 vasitos',precio:110,cat:'enchilados',piezas:20,stock:25,tope:20,desc:'Vasito individual con chile y sal. Práctico para reventa.'},
      {id:'enc-06',nombre:'Mango enchilado deshidratado',unidad:'Bolsa 400 g',precio:84,cat:'enchilados',etiqueta:'nuevo',piezas:45,stock:20,tope:20,desc:'Mango en tiras con chile. De los que más han pegado este año.'},
      {id:'enc-07',nombre:'Rielitos de tamarindo',unidad:'Caja 24 piezas',precio:78,cat:'enchilados',piezas:24,stock:30,tope:20,desc:'Tiras de tamarindo con chile en presentación individual.'},
      {id:'enc-08',nombre:'Cueritos enchilados',unidad:'Bolsa 500 g',precio:64,cat:'enchilados',piezas:70,stock:30,tope:20,desc:'Gomita salada y picosa. La botana de dulcería por excelencia.'},
      {id:'fie-01',nombre:'Surtido piñatero armado',unidad:'Paquete 3 kg',precio:250,antes:290,cat:'fiesta',etiqueta:'top',piezas:0,stock:25,tope:10,desc:'Mezcla lista para rellenar piñata: gomitas, paletas, caramelos y enchilados.'},
      {id:'fie-02',nombre:'Globos metálicos surtidos',unidad:'Paquete 12 piezas',precio:80,cat:'fiesta',etiqueta:'nuevo',piezas:0,stock:30,tope:20,desc:'Colores metálicos surtidos. Combínalos con el color de tu evento.'},
      {id:'fie-03',nombre:'Velas mágicas de chispas',unidad:'Paquete 10 piezas',precio:40,cat:'fiesta',piezas:0,stock:40,tope:20,desc:'Las que no se apagan al soplar. Para el momento del pastel.'},
      {id:'fie-04',nombre:'Bolsitas de dulces armadas',unidad:'10 bolsitas',precio:150,cat:'fiesta',piezas:0,stock:20,tope:20,desc:'Ya preparadas y selladas. Nos dices cuántos invitados y las dejamos listas.'},
      {id:'fie-05',nombre:'Piñata de estrella mediana',unidad:'1 pieza',precio:180,cat:'fiesta',piezas:0,stock:15,tope:10,desc:'Piñata tradicional de papel. Aguanta bien y se ve grande en la foto.'},
      {id:'fie-06',nombre:'Bolsitas de celofán decoradas',unidad:'Paquete 25 piezas',precio:45,cat:'fiesta',piezas:25,stock:35,tope:20,desc:'Vacías, para que tú armes el surtido. Con listones de colores incluidos.'},
      {id:'fie-07',nombre:'Serpentinas y confeti',unidad:'Paquete 12 piezas',precio:55,cat:'fiesta',piezas:0,stock:30,tope:20,desc:'Para el momento de la foto. Colores surtidos.'},
      {id:'fie-08',nombre:'Platos y vasos temáticos',unidad:'Paquete 25 juegos',precio:120,cat:'fiesta',piezas:0,stock:25,tope:20,desc:'Desechables a juego. Varios diseños disponibles en tienda.'},
      {id:'fie-09',nombre:'Piñata de personaje grande',unidad:'1 pieza',precio:320,antes:365,cat:'fiesta',piezas:0,stock:10,tope:5,desc:'Piñata grande de papel. Pregunta por diseños disponibles.'}
    ];

    let BANNERS = [
      { clase:'banner--1', tag:'Envío gratis', titulo:'Desde $399 te lo llevamos',
        texto:'Dentro de la ciudad de Puebla, sin costo de envío. Arma tu pedido y nosotros vemos la entrega.',
        cta:'Comprar ahora', destino:'#catalogo' },
      { clase:'banner--2', tag:'Ahorro por volumen', titulo:'5% desde 5 piezas',
        texto:'Junta 5 o más piezas del mismo producto y esa línea baja 5%. Producto por producto, sin monto mínimo.',
        cta:'Ver el catálogo', destino:'#catalogo' },
      { clase:'banner--3', tag:'Herramienta gratis', titulo:'Te armamos la piñata',
        texto:'Elige dulces uno por uno y míralos caer dentro. Cuando quedes conforme, te lo cotizamos.',
        cta:'Llenar mi piñata', destino:'#pinata' }
    ];

    const MARCAS = [
      {archivo:'anahuac.png',    nombre:'Anáhuac',      color:'#E30613'},
      {archivo:'canels.png',     nombre:"Canel's",      color:'#0085CA'},
      {archivo:'chupachups.png', nombre:'Chupa Chups',  color:'#D4007E'},
      {archivo:'ferrero.png',    nombre:'Ferrero',      color:'#8B5E3C'},
      {archivo:'hershey.png',    nombre:"Hershey's",    color:'#3C1053'},
      {archivo:'la perla.png',   nombre:'La Perla',     color:'#E30613'},
      {archivo:'la poblana.png', nombre:'La Poblana',   color:'#00A650'},
      {archivo:'DELAROSA.png',   nombre:'De la Rosa',   color:'#E4002B'},
      {archivo:'RICOLINO.png',   nombre:'Ricolino',     color:'#E30613'},
      {archivo:'VERO.png',       nombre:'Vero',         color:'#F7941D'}
    ];

    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    const dinero = n => '$' + Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
    const limpiar = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const escapar = t => String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const waLink  = m => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(m)}`;
    const nombreCat = id => (CATEGORIAS.find(c=>c.id===id)||{}).nombre || id;
    const imgDe = p => p.img || (CATEGORIAS.find(c=>c.id===p.cat)||{}).img || 'img/ICONO.png';
    const pctOff = p => p.antes ? Math.round((1 - p.precio/p.antes) * 100) : 0;
    const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function avisar(msg, ico='🍬'){
      const cont = $('#avisos');
      if (!cont) return;
      const t = document.createElement('div');
      t.className = 'aviso';
      t.innerHTML = `<span aria-hidden="true">${ico}</span><span>${escapar(msg)}</span>`;
      cont.appendChild(t);
      setTimeout(()=>{ t.classList.add('sale'); t.addEventListener('animationend',()=>t.remove(),{once:true}); }, 2600);
    }

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
        const heno = limpiar(`${p.nombre} ${nombreCat(p.cat)} ${p.unidad} ${p.desc}`);
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
          <p class="prod__cat">${nombreCat(p.cat)}</p>
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

    let cantidadFicha = 1;
    function pintarFicha(p){
      cantidadFicha = 1;
      const off = pctOff(p);
      const conDesc = p.precio * CONFIG.piezasParaDescuento * (1-CONFIG.descuentoPorProducto);

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
            <p class="ficha__cat">${nombreCat(p.cat)}${p.etiqueta==='top'?' · Más vendido':''}</p>
            <h1 class="ficha__nom">${escapar(p.nombre)}</h1>
            ${p.antes?`<p class="ficha__antes">${dinero(p.antes)}</p>`:''}
            <p class="ficha__precio">${dinero(p.precio)}${off?`<span class="ficha__off">${off}% OFF</span>`:''}</p>
            <p class="ficha__unidad">Presentación: ${escapar(p.unidad)}</p>
            <p class="ficha__envio"><span aria-hidden="true">🚚</span> Envío gratis en pedidos desde ${dinero(CONFIG.envioGratisDesde)}</p>
            <div class="ficha__vol">
              Llevando <b>${CONFIG.piezasParaDescuento} o más piezas</b> de este producto,
              el precio baja a <b>${dinero(conDesc/CONFIG.piezasParaDescuento)}</b> cada una.
            </div>
            <p class="ficha__desc">${escapar(p.desc || '')}</p>
            <div class="cantidad">
              <div class="cantidad__ctrl">
                <button type="button" id="f-menos" aria-label="Menos">−</button>
                <span id="f-cant">1</span>
                <button type="button" id="f-mas" aria-label="Más">+</button>
              </div>
              <small id="f-nota"></small>
            </div>
            <div class="ficha__cta">
              <button class="btn btn--primario btn--bloque" id="f-add">Agregar al pedido</button>
              <a class="btn btn--wa btn--bloque" id="f-wa" href="#" target="_blank" rel="noopener">Pedir solo este por WhatsApp</a>
            </div>
            <div class="ficha__meta">
              <span>Recoge sin costo en cualquiera de nuestras sucursales Click & Collect.</span>
              <span>Pago con efectivo, transferencia SPEI o tarjeta.</span>
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
        $('#f-wa').href = waLink(
          `¡Hola! 👋 Me interesa este producto de su tienda en línea:\n\n🍬 ${cantidadFicha}x ${p.nombre} (${p.unidad}) — ${dinero(p.precio*cantidadFicha)}\n\n¿Tienen disponible?`);
      };
      nota();

      $('#f-menos').addEventListener('click', ()=>{ if(cantidadFicha>1) cantidadFicha--; nota(); });
      $('#f-mas').addEventListener('click',   ()=>{ if(cantidadFicha < (p.tope || 20)) cantidadFicha++; nota(); });
      $('#f-add').addEventListener('click', function() {
        agregar(p.id, cantidadFicha);
        const txtOriginal = this.innerHTML;
        this.innerHTML = '¡Agregado! ✔️';
        this.classList.add('btn--agregado');
        setTimeout(() => {
          this.innerHTML = txtOriginal;
          this.classList.remove('btn--agregado');
        }, 1500);
      });
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
        const bruto  = p.precio*cant;
        const aplica = cant >= CONFIG.piezasParaDescuento;
        const ahorro = aplica ? bruto*CONFIG.descuentoPorProducto : 0;
        piezas+=cant; subtotal+=bruto; descuento+=ahorro;
        lineas.push({p,cant,bruto,aplica,ahorro,neto:bruto-ahorro,
                     faltan: aplica?0:CONFIG.piezasParaDescuento-cant});
      });
      return { piezas, subtotal, descuento, total:subtotal-descuento, lineas,
               hayDescuento: descuento>0, conDescuento: lineas.filter(l=>l.aplica).length };
    }

    function agregar(id, cant=1, callado=false){
      const p = PRODUCTOS.find(x=>String(x.id)===String(id));
      if(!p) return;
      const maxTope = p.tope || 20;
      if ((pedido[id] || 0) + cant > maxTope) {
        avisar(`Máximo ${maxTope} piezas por pedido de este artículo`, '⚠️');
        return;
      }
      pedido[id] = (pedido[id]||0) + cant;
      guardarPedido(); pintarCarrito();
      if(!callado) avisar(`${p.nombre} agregado`, '🛒');
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

      const meta = $('#meta');
      if (piezas===0){ meta.hidden = true; }
      else {
        meta.hidden = false;
        $('#meta-txt').textContent = subtotal < CONFIG.envioGratisDesde
          ? `Te faltan ${dinero(CONFIG.envioGratisDesde-subtotal)} para envío gratis en Puebla`
          : 'Envío gratis en Puebla activado';
        $('#meta-fill').style.width = Math.min(100,(subtotal/CONFIG.envioGratisDesde)*100)+'%';
      }
      guardarPedido();
    }

    const abrirCarrito = ()=>{ $('#carrito').hidden=false; $('#velo').hidden=false; document.body.style.overflow='hidden'; };
    const cerrarCarrito= ()=>{ $('#carrito').hidden=true; $('#velo').hidden=true; document.body.style.overflow=''; };

    $('#abrir-carrito').addEventListener('click', abrirCarrito);
    $('#movil-abrir').addEventListener('click', abrirCarrito);
    $('#carrito-cerrar').addEventListener('click', cerrarCarrito);
    $('#carrito-ir').addEventListener('click', ()=>{ cerrarCarrito(); irArriba(); });
    $('#velo').addEventListener('click', ()=>{ cerrarCarrito(); cerrarFiltros(); });

    document.addEventListener('click', e=>{
      const a = e.target.closest('[data-add]');
      if(a){
        agregar(a.dataset.add);
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

    $('#pagar').addEventListener('click', ()=>{
      const { subtotal, descuento, total, lineas, hayDescuento, conDescuento } = totales();
      let msg = '¡Hola! 👋 Armé este pedido en su tienda en línea:\n\n';
      lineas.forEach(({p,cant,bruto,aplica,neto})=>{
        msg += `🍬 ${cant}x ${p.nombre} (${p.unidad}) — ${dinero(bruto)}`;
        if(aplica) msg += ` → ${dinero(neto)} (−5%)`;
        msg += '\n';
      });
      msg += `\nSubtotal: ${dinero(subtotal)}`;
      if(hayDescuento) msg += `\nDescuento 5% (${conDescuento} ${conDescuento===1?'producto':'productos'}): −${dinero(descuento)}`;
      msg += `\n*Total: ${dinero(total)}*`;
      if(subtotal>=CONFIG.envioGratisDesde) msg += '\n\n(Aplica envío gratis en Puebla)';
      msg += '\n\n¿Me confirman disponibilidad y entrega? ✨';
      window.open(waLink(msg), '_blank');
    });

    // Buscador
    const input = $('#q');
    const sug   = $('#sugerencias');
    const ATAJOS = ['Gomitas','Chocolates','Paletas','Enchilados','Mazapán','Piñatas'];
    function cerrarSug(){ sug.classList.remove('on'); sug.innerHTML=''; input.setAttribute('aria-expanded','false'); }
    function pintarSug(){
      const q = limpiar(input.value);
      if(!q){
        sug.innerHTML = `<p class="sug__t">Búsquedas frecuentes</p>
          <div class="sug__chips">${ATAJOS.map(a=>`<button class="sug__chip" data-txt="${escapar(a)}">${escapar(a)}</button>`).join('')}</div>`;
      } else {
        const hits = PRODUCTOS.filter(p=>{
          const heno = limpiar(`${p.nombre} ${nombreCat(p.cat)} ${p.unidad} ${p.desc}`);
          return q.split(' ').every(w=>heno.includes(w));
        }).slice(0,7);
        sug.innerHTML = hits.length
          ? hits.map((p,i)=>`
              <button class="sug__it" role="option" data-id="${p.id}" data-i="${i}">
                <img src="${escapar(imgDe(p))}" alt="" loading="lazy" onerror="this.src='img/ICONO.png'">
                <span><span class="sug__n">${escapar(p.nombre)}</span><br>
                      <span class="sug__c">${nombreCat(p.cat)} · ${escapar(p.unidad)}</span></span>
                <span class="sug__p">${dinero(p.precio)}</span>
              </button>`).join('')
          : `<p class="sug__nada">Sin resultados para “${escapar(input.value)}”.</p>`;
      }
      sug.classList.add('on');
    }
    input.addEventListener('input', ()=>{ pintarSug(); filtro.texto = input.value; filtro.pagina=1; pintarCatalogo(); });
    input.addEventListener('focus', pintarSug);
    $('#form-busqueda').addEventListener('submit', e=>{ e.preventDefault(); filtro.texto = input.value; cerrarSug(); pintarCatalogo(); irArriba(); });
    sug.addEventListener('click', e=>{
      const it = e.target.closest('.sug__it');
      if(it){ location.hash=`#/producto/${it.dataset.id}`; cerrarSug(); return; }
      const ch = e.target.closest('.sug__chip');
      if(ch){ input.value=ch.dataset.txt; filtro.texto=ch.dataset.txt; cerrarSug(); pintarCatalogo(); irArriba(); }
    });
    document.addEventListener('click', e=>{ if(!e.target.closest('.buscador')) cerrarSug(); });

    // Banners
    let banner = 0, bannerTimer;
    function pintarBanners(){
      $('#banners').innerHTML = BANNERS.map(b=>`
        <article class="banner ${b.clase}">
          <span class="banner__tag">${escapar(b.tag)}</span>
          <h2>${escapar(b.titulo)}</h2>
          <p>${escapar(b.texto)}</p>
          <a class="btn" href="${b.destino}">${escapar(b.cta)}</a>
        </article>`).join('');
      $('#banner-dots').innerHTML = BANNERS.map((_,i)=>
        `<button data-b="${i}" aria-current="${i===0}" aria-label="Promoción ${i+1}"></button>`).join('');
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
          <img src="img/${escapar(m.archivo)}" alt="${escapar(m.nombre)}" loading="lazy"
               onerror="this.closest('.marca').classList.add('sin-foto');this.remove()">
          <b>${escapar(m.nombre)}</b>
        </span>`).join('');
      $('#marcas').innerHTML = uno + uno;
    }

    // Piñata interactiva
    const META_PINATA = 60;
    const LLAVE_PINATA = 'candy_pinata_v2';
    let pinata = {};

    function pintarDulces(){
      $('#dulces').innerHTML = PRODUCTOS.filter(p=>p.cat!=='fiesta').map(p=>`
        <button class="dulce" data-pinata="${p.id}" aria-label="Echar ${escapar(p.nombre)}">
          <img src="${escapar(imgDe(p))}" alt="" loading="lazy" width="46" height="46" onerror="this.src='img/ICONO.png'">
          <span>${escapar(p.nombre)}</span><b>${dinero(p.precio)}</b>
        </button>`).join('');
    }

    function pintarPinata(){
      const ids = Object.keys(pinata).filter(id => PRODUCTOS.some(x=>String(x.id)===String(id)));
      const piezas = ids.reduce((a,id)=>a+pinata[id],0);
      const importe = ids.reduce((s,id)=>{ const p=PRODUCTOS.find(x=>String(x.id)===String(id)); return s+(p?p.precio*pinata[id]:0); },0);

      $('#pinata-n').textContent = piezas;
      $('#pinata-fill').style.width = Math.min(100,(piezas/META_PINATA)*100)+'%';
      $('#pinata-estado').textContent = piezas===0 ? 'Todavía está vacía'
        : piezas>=META_PINATA ? `¡Bien llena! ${piezas} dulces · ${dinero(importe)}`
        : `${piezas} ${piezas===1?'dulce':'dulces'} adentro · ${dinero(importe)}`;

      $('#pinata-lista').innerHTML = ids.map(id=>{
        const p = PRODUCTOS.find(x=>String(x.id)===String(id));
        return `<li class="pieza">
          <img src="${escapar(imgDe(p))}" alt="" loading="lazy" onerror="this.src='img/ICONO.png'">
          <span>${escapar(p.nombre)}</span><b>${pinata[id]}</b>
          <button data-sacar="${id}" aria-label="Sacar">✕</button></li>`;
      }).join('');

      $('#pinata-add').disabled = piezas===0;
      $('#pinata-vaciar').hidden = piezas===0;
      $('#pinata-wa').href = waLink(`¡Hola! 👋 Armé una piñata con ${piezas} dulces (${dinero(importe)}). ¿Me confirman disponibilidad?`);
      try{ localStorage.setItem(LLAVE_PINATA, JSON.stringify(pinata)); }catch(_){}
    }

    $('#dulces').addEventListener('click', e=>{
      const b = e.target.closest('[data-pinata]');
      if(!b) return;
      const p = PRODUCTOS.find(x=>String(x.id)===String(b.dataset.pinata));
      if(!p) return;
      pinata[p.id] = (pinata[p.id]||0)+1;
      pintarPinata();
    });
    $('#pinata-lista').addEventListener('click', e=>{
      const x = e.target.closest('[data-sacar]');
      if(x){ delete pinata[x.dataset.sacar]; pintarPinata(); }
    });
    $('#pinata-vaciar').addEventListener('click', ()=>{ pinata={}; pintarPinata(); avisar('Piñata vacía','🪅'); });
    $('#pinata-add').addEventListener('click', ()=>{
      Object.entries(pinata).forEach(([id,c])=>{ pedido[id]=(pedido[id]||0)+c; });
      guardarPedido(); pintarCarrito(); avisar('Tu piñata pasó al pedido','🎉'); abrirCarrito();
    });

    $$('.qa__q').forEach(b=>b.addEventListener('click',()=>{
      const bloque = b.closest('.qa');
      const abierto = bloque.classList.contains('on');
      $$('.qa').forEach(q=>{ q.classList.remove('on'); $('.qa__q',q).setAttribute('aria-expanded','false'); });
      if(!abierto){ bloque.classList.add('on'); b.setAttribute('aria-expanded','true'); }
    }));

    $('#burger').addEventListener('click', ()=>{
      const on = $('#catnav-links').classList.toggle('on');
      $('#burger').setAttribute('aria-expanded', on);
    });

    const M_GENERAL = '¡Hola! 👋 Vi su tienda en línea y me gustaría más información.';
    $('#wa-head').href  = waLink(M_GENERAL);
    $('#wa-pie').href   = waLink('¡Hola! 👋 Vengo de su página web. ¿Me apoyan con una cotización?');
    $('#wa-cta').href   = waLink(M_GENERAL);
    $('#wa-nohay').href = waLink('¡Hola! 👋 Busqué un producto en su tienda en línea y no lo encontré. ¿Lo manejan?');
    $('#wa-fab').href   = waLink(M_GENERAL);

    // SINCRONIZACIÓN EN VIVO CON SUPABASE (tbl_productos y tbl_promociones_banners)
    async function sincronizarConSupabase() {
      const { data: prodsDB } = await supabase
        .from('tbl_productos')
        .select('*, tbl_categorias(slug)')
        .eq('activo', true);

      if (prodsDB && prodsDB.length > 0) {
        const mapeados = prodsDB.map(db => {
          const descPct = db.porcentaje_descuento || 0;
          const precioFinal = Number(db.precio_unitario);
          const precioAntes = descPct > 0 ? Math.round(precioFinal / (1 - descPct / 100)) : null;
          return {
            id: db.codigo_barras || String(db.id_producto),
            nombre: db.nombre_dulce,
            unidad: db.presentacion || 'Pieza',
            precio: precioFinal,
            antes: precioAntes,
            cat: db.tbl_categorias?.slug || 'gomitas',
            etiqueta: descPct > 0 ? 'top' : 'nuevo',
            piezas: 50,
            stock: db.stock_web,
            tope: db.tope_maximo_compra || 20,
            es_transaccional: db.es_transaccional,
            img: db.imagen_url || null,
            desc: db.descripcion || ''
          };
        });

        // Actualizar o agregar productos que vienen del Mini-ERP en Supabase
        mapeados.forEach(itemDB => {
          const idx = PRODUCTOS.findIndex(p => p.id === itemDB.id || p.nombre.toLowerCase() === itemDB.nombre.toLowerCase());
          if (idx >= 0) PRODUCTOS[idx] = { ...PRODUCTOS[idx], ...itemDB };
          else PRODUCTOS.unshift(itemDB);
        });
      }

      const { data: bannersDB } = await supabase
        .from('tbl_promociones_banners')
        .select('*')
        .eq('estado', 'Activo');

      if (bannersDB && bannersDB.length > 0) {
        BANNERS = bannersDB.map((b, i) => {
          const partes = (b.leyenda_exclusividad || '').split('|');
          return {
            clase: `banner--${(i % 3) + 1}`,
            tag: partes[0]?.trim() || 'Promoción',
            titulo: b.titulo,
            texto: partes[1]?.trim() || b.leyenda_exclusividad,
            cta: 'Ver promoción',
            destino: b.imagen_banner_url?.startsWith('#') ? b.imagen_banner_url : '#catalogo'
          };
        });
      }

      pintarBanners();
      pintarRubros();
      pintarEstantes();
      pintarDulces();
      pintarCatalogo();
      pintarCarrito();
    }

    // Inicialización visual inmediata
    pintarCatnav();
    pintarRubros();
    pintarBanners();
    irBanner(0);
    autoBanner();
    pintarEstantes();
    pintarMarcas();
    pintarDulces();
    cargarPedido();
    pintarCarrito();
    pintarPinata();
    pintarCatalogo();
    router();

    // Conectar con Supabase y escuchar cambios en tiempo real desde el Mini-ERP
    sincronizarConSupabase();
    supabase
      .channel('cambios-erp-tienda')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_productos' }, () => sincronizarConSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tbl_promociones_banners' }, () => sincronizarConSupabase())
      .subscribe();
  }, []);

  return (
    <>
      <a className="skip" href="#principal">Saltar al contenido</a>

      <div className="cinta" aria-label="Avisos de la tienda">
        <div className="cinta__pista">
          <div className="cinta__grupo">
            <span><b>Envío gratis</b> en Puebla desde $399</span><i aria-hidden="true">✳</i>
            <span><b>5% de descuento</b> desde 5 piezas del mismo producto</span><i aria-hidden="true">✳</i>
            <span><b>12 sucursales</b> en Puebla</span><i aria-hidden="true">✳</i>
            <span>Surtimos tu negocio, tu fiesta y tu piñata</span><i aria-hidden="true">✳</i>
            <span><b>20 años</b> endulzando Puebla</span><i aria-hidden="true">✳</i>
          </div>
          <div className="cinta__grupo" aria-hidden="true">
            <span><b>Envío gratis</b> en Puebla desde $399</span><i>✳</i>
            <span><b>5% de descuento</b> desde 5 piezas del mismo producto</span><i>✳</i>
            <span><b>12 sucursales</b> en Puebla</span><i>✳</i>
            <span>Surtimos tu negocio, tu fiesta y tu piñata</span><i>✳</i>
            <span><b>20 años</b> endulzando Puebla</span><i>✳</i>
          </div>
        </div>
      </div>

      <header className="head">
        <div className="head__in">
          <a href="#/" className="marca" aria-label="Dulcerías Candy, inicio">
            <img src="img/LOGO CANDY.png" alt="Dulcerías Candy" onError={(e) => { e.currentTarget.src = 'img/ICONO.png'; }} />
          </a>

          <div className="buscador">
            <form className="buscador__caja" id="form-busqueda" role="search">
              <label className="sr" htmlFor="q">Buscar productos</label>
              <input type="search" id="q" placeholder="Buscar gomitas, chocolates, mazapán, piñatas…" autoComplete="off" />
              <button type="submit" className="buscador__btn" aria-label="Buscar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 105.3 14l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></svg>
              </button>
            </form>
            <div className="sug" id="sugerencias" role="listbox" aria-label="Sugerencias"></div>
          </div>

          <div className="head__acc">
            <a className="acc" id="wa-head" href="#" target="_blank" rel="noopener">
              <span className="acc__txt"><small>¿Dudas?</small><b>Escríbenos</b></span>
            </a>

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
                <p className="subtitulo">Cuatro pasos y tu pedido llega a nuestro sistema o WhatsApp.</p>
              </div>
              <ol className="pasos__lista">
                <li className="paso" data-n="1" style={{ '--c': '#EC008C' }}>
                  <span className="paso__n">1</span><span className="paso__ico">🔎</span>
                  <h3>Busca lo que necesitas</h3><p>Usa el buscador de arriba o filtra por categoría y precio.</p>
                </li>
                <li className="paso" data-n="2" style={{ '--c': '#0085CA' }}>
                  <span className="paso__n">2</span><span className="paso__ico">🛒</span>
                  <h3>Agrégalo a tu pedido</h3><p>Ajusta cantidades. Desde 5 piezas del mismo producto baja 5%.</p>
                </li>
                <li className="paso" data-n="3" style={{ '--c': '#00A650' }}>
                  <span className="paso__n">3</span><span className="paso__ico">💬</span>
                  <h3>Confirma tu orden</h3><p>Elige envío a domicilio o recolección Click & Collect sin costo.</p>
                </li>
                <li className="paso" data-n="4" style={{ '--c': '#F7941D' }}>
                  <span className="paso__n">4</span><span className="paso__ico">📦</span>
                  <h3>Recibe o recoge con QR</h3><p>Presenta tu código QR en sucursal o recibe en Puebla.</p>
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
                    <p className="vacio__ico">🔍</p>
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

          <div className="banda banda--menta">
            <section className="pinata" id="pinata">
              <div className="pinata__in">
                <div className="pinata__lado">
                  <p className="etiqueta">Herramienta gratis</p>
                  <h2>Llena tu piñata</h2>
                  <p className="pinata__txt">Toca dulces y míralos caer dentro. Cuando quedes conforme, pásalo a tu pedido o mándanoslo por WhatsApp.</p>
                  <div className="pinata__escena">
                    <img src="img/Fiesta.png" alt="Piñata de estrella" id="pinata-img" width="220" height="220" />
                    <span className="pinata__n" id="pinata-n" aria-hidden="true">0</span>
                  </div>
                  <p className="pinata__estado" id="pinata-estado" role="status">Todavía está vacía</p>
                  <div className="pinata__barra"><i id="pinata-fill"></i></div>
                  <ul className="pinata__lista" id="pinata-lista"></ul>
                  <div className="pinata__cta">
                    <button className="btn btn--primario" id="pinata-add" disabled>Pasar a mi pedido</button>
                    <a className="btn btn--wa" id="pinata-wa" href="#" target="_blank" rel="noopener">Mandar por WhatsApp</a>
                  </div>
                  <button className="link link--tenue" id="pinata-vaciar" hidden>Vaciar la piñata</button>
                </div>
                <div className="pinata__lado">
                  <p className="etiqueta">Toca un dulce para echarlo</p>
                  <div className="dulces" id="dulces"></div>
                </div>
              </div>
            </section>

            <section className="garantias" aria-label="Por qué comprarnos">
              <div className="garantias__in">
                <div className="gar" style={{ '--c': '#00A650' }}><span>🚚</span><b>Envío gratis desde $399</b><small>Dentro de la ciudad de Puebla</small></div>
                <div className="gar" style={{ '--c': '#EC008C' }}><span>🏷️</span><b>5% desde 5 piezas</b><small>Por producto, sin monto mínimo</small></div>
                <div className="gar" style={{ '--c': '#0085CA' }}><span>🏪</span><b>12 sucursales</b><small>Recoge donde te quede cerca</small></div>
                <div className="gar" style={{ '--c': '#F7941D' }}><span>🕒</span><b>20 años surtiendo</b><small>Desde 2004 en Puebla</small></div>
              </div>
            </section>

            <section className="sucursales" id="sucursales">
              <div className="centrado">
                <p className="antetitulo"><span>📍</span> Cerca de ti</p><br />
                <h2 className="titulo">Dónde estamos</h2>
                <p className="subtitulo">Sucursales en Puebla. Todas surten menudeo, mayoreo y Click & Collect.</p>
              </div>
              <div className="sucursales__grid">
                <article className="suc">
                  <div className="suc__cuerpo">
                    <h3>Central de Abasto</h3>
                    <ul><li>Matriz</li><li>Azúcar</li><li>Chocolate</li><li>Central de Abasto</li><li>Corporativo Candy</li></ul>
                  </div>
                </article>
                <article className="suc">
                  <div className="suc__cuerpo">
                    <h3>Centro Histórico (Nodo 2 Norte)</h3>
                    <ul>
                      <li>2 Norte y 8 Oriente (Nodo Central Web)</li>
                      <li>12 Poniente 114, Junior</li><li>12 Poniente 119</li><li>8 Poniente 318</li>
                      <li>10 Poniente 109</li><li>14 Poniente 310-B <span className="nueva">Nueva</span></li>
                    </ul>
                  </div>
                </article>
                <article className="suc">
                  <div className="suc__cuerpo">
                    <h3>Sur de Puebla</h3>
                    <ul><li>11 Sur 9515, Club de Golf</li></ul>
                  </div>
                </article>
              </div>
            </section>

            <section className="faq" id="preguntas">
              <div className="centrado">
                <p className="antetitulo"><span>💡</span> Dudas comunes</p><br />
                <h2 className="titulo">Preguntas frecuentes</h2>
              </div>
              <div className="faq__lista">
                <article className="qa"><h3><button className="qa__q" aria-expanded="false">¿Cómo funciona el descuento del 5%?<span className="qa__i">+</span></button></h3>
                  <div className="qa__a"><p>Se aplica producto por producto: si llevas 5 o más piezas del mismo producto, esa línea baja 5%.</p></div></article>
                <article className="qa"><h3><button className="qa__q" aria-expanded="false">¿Hacen envíos o recolección en tienda?<span className="qa__i">+</span></button></h3>
                  <div className="qa__a"><p>Sí. En Puebla el envío es gratis desde $399 o puedes elegir Click & Collect sin costo en nuestras sucursales autorizadas.</p></div></article>
              </div>
            </section>
          </div>
        </div>

        <div id="vista-producto" hidden></div>
      </main>

      <footer className="pie">
        <div className="pie__cta">
          <div className="pie__cta-in">
            <div><h2>¿Ya sabes qué quieres?</h2><p>Arma tu pedido en línea o escríbenos y te lo cotizamos en minutos.</p></div>
            <div className="pie__cta-btns">
              <a className="btn btn--amarillo" href="#catalogo">Ver el catálogo</a>
              <a className="btn btn--wa" id="wa-cta" href="#" target="_blank" rel="noopener">Escríbenos</a>
            </div>
          </div>
        </div>
        <div className="pie__in">
          <div className="pie__col pie__col--marca">
            <p>Dulces, chocolates y artículos de fiesta en Puebla desde 2004. Surtimos tu negocio, tu fiesta y tu piñata.</p>
          </div>
          <div className="pie__col"><h4>Comprar</h4><div id="pie-cats"></div></div>
          <div className="pie__col">
            <h4>Ayuda</h4>
            <a href="#como-comprar">Cómo comprar</a>
            <a href="#preguntas">Preguntas frecuentes</a>
            <a href="#sucursales">Sucursales y horarios</a>
            <a href="#pinata">Llena tu piñata</a>
          </div>
          <div className="pie__col">
            <h4>Contacto</h4>
            <a id="wa-pie" href="#" target="_blank" rel="noopener" className="pie__tel">
              <b>221 434 9590</b><small>WhatsApp y teléfono</small>
            </a>
          </div>
        </div>
        <p className="pie__legal">© 2026 Dulcerías Candy · Puebla, México · Hecho con mucha azúcar</p>
      </footer>

      <div className="movil" id="movil" hidden>
        <div><b id="movil-n">0 productos</b><span id="movil-total">$0.00</span></div>
        <button className="btn btn--primario btn--sm" id="movil-abrir">Ver pedido</button>
      </div>

      <div className="velo" id="velo" hidden></div>

      <aside className="carrito" id="carrito" role="dialog" aria-modal="true" aria-labelledby="carrito-t" hidden>
        <header className="carrito__head">
          <h2 id="carrito-t">Tu pedido</h2>
          <button className="cerrar" id="carrito-cerrar" aria-label="Cerrar">✕</button>
        </header>
        <div className="carrito__cuerpo">
          <ul className="carrito__lista" id="carrito-lista"></ul>
          <div className="carrito__vacio" id="carrito-vacio">
            <p>🛒</p><h3>Tu pedido está vacío</h3><p>Agrega productos del catálogo y aparecerán aquí.</p>
            <button className="btn btn--primario" id="carrito-ir">Ver el catálogo</button>
          </div>
        </div>
        <footer className="carrito__pie">
          <div className="meta" id="meta" hidden><p id="meta-txt"></p><div className="meta__barra"><i id="meta-fill"></i></div></div>
          <div className="fila"><span>Productos</span><span id="c-sub">$0.00</span></div>
          <div className="fila fila--off" id="fila-off" hidden><span>Descuento 5%</span><span id="c-off">−$0.00</span></div>
          <div className="fila fila--total"><span>Total</span><span id="c-total">$0.00</span></div>
          <p className="carrito__nota">El envío o recolección Click & Collect se confirma al finalizar.</p>
          <button className="btn btn--wa btn--bloque" id="pagar" disabled>Mandar pedido por WhatsApp</button>
        </footer>
      </aside>

      <a className="fab" id="wa-fab" href="#" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
        <span className="fab__globo">¿Dudas? Escríbenos</span>
      </a>

      <div className="avisos" id="avisos" aria-live="polite"></div>
    </>
  );
}
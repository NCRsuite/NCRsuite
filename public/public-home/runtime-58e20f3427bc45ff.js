var bx=Object.defineProperty;var yx=(i,e,t)=>e in i?bx(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var Te=(i,e,t)=>yx(i,typeof e!="symbol"?e+"":e,t);var it=globalThis[Symbol.for("ncr.public-home.react")].React,BM=it.Children,OM=it.Component,zM=it.Fragment,HM=it.Profiler,VM=it.PureComponent,GM=it.StrictMode,WM=it.Suspense,qM=it.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,XM=it.act,YM=it.cloneElement,mh=it.createContext,$i=it.createElement,ZM=it.createFactory,KM=it.createRef,Po=it.forwardRef,JM=it.isValidElement,$M=it.lazy,QM=it.memo,jM=it.startTransition,eL=it.unstable_act,gh=it.useCallback,xh=it.useContext,tL=it.useDebugValue,aL=it.useDeferredValue,Ot=it.useEffect,_h=it.useId,nL=it.useImperativeHandle,iL=it.useInsertionEffect,rL=it.useLayoutEffect,Sx=it.useMemo,sL=it.useReducer,at=it.useRef,wa=it.useState,oL=it.useSyncExternalStore,lL=it.useTransition,cL=it.version;var vh=i=>i?.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();function bh(i,e,t=[]){if(e==null)throw new Error("[lucide]: iconNode is required when icon name is used");return{name:vh(i),size:24,node:e,...t.length>0?{aliases:t}:{}}}var yh=i=>{let e="",t=!1;for(let a of i){if(a==="-"||a==="_"||a<=" "){t=e.length>0;continue}e.length===0?e+=a.toLowerCase():e+=t?a.toUpperCase():a,t=!1}return e};var Sh=i=>{let e=yh(i);return e.charAt(0).toUpperCase()+e.slice(1)};var Qr=(...i)=>i.filter((e,t,a)=>!!e&&e.trim()!==""&&a.indexOf(e)===t).join(" ").trim();var Yn={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};function gu(i){return i!=null}function wh(i,e={}){let t=e.attributeNames??{},a=d=>t[d]??d,n=i.size??i.width??Yn.width,r=i.size??i.height??Yn.height,s=i.aliases?.filter(d=>typeof d=="string"&&d.trim()!=="").map(d=>`lucide-${d}`)??[],o=[...i.name?[`lucide-${i.name}`]:[],...s],l=e.className?.split(" ").filter(Boolean)??[],c=e.includeDefaultClasses===!1?Qr(...l):Qr("lucide",...o,...l),u=e.absoluteStrokeWidth?Number(e.strokeWidth??Yn["stroke-width"])*Number(i.size??i.width??Yn.width)/Number(e.size??e.width??Yn.width):e.strokeWidth??Yn["stroke-width"];return["svg",{...Object.entries(Yn).reduce((d,[h,x])=>(d[a(h)]=x,d),{}),..."color"in e&&e.color&&{[a("stroke")]:e.color},..."size"in e&&gu(e.size)&&{[a("width")]:e.size,[a("height")]:e.size},..."width"in e&&gu(e.width)&&{[a("width")]:e.width},..."height"in e&&gu(e.height)&&{[a("height")]:e.height},[a("stroke-width")]:u,...c&&{[a("class")]:c},[a("viewBox")]:`0 0 ${n} ${r}`,...e.hasA11yProp===!1?{[a("aria-hidden")]:"true"}:{},..."attributes"in e&&e.attributes},i.node.map(d=>{let[h,x,g]=d,p=e.nonScalingStroke?{[a("vector-effect")]:"non-scaling-stroke",...x}:x;return g?[h,p,g]:[h,p]})]}function Mh(i,e={}){return wh(i,{...e,attributeNames:{...e.attributeNames,class:"className","stroke-width":"strokeWidth","stroke-linecap":"strokeLinecap","stroke-linejoin":"strokeLinejoin","vector-effect":"vectorEffect"}})}var Lh=i=>{for(let e in i)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1};var wx=mh({});var Ch=()=>xh(wx);var Ih=Po(({color:i,size:e,width:t,height:a,strokeWidth:n,absoluteStrokeWidth:r,nonScalingStroke:s,className:o="",children:l,iconNode:c=[],icon:u={node:c,aliases:[],size:24},...f},d)=>{let{size:h=24,strokeWidth:x=2,absoluteStrokeWidth:g=!1,nonScalingStroke:p=!1,color:m="currentColor",className:y=""}=Ch()??{},L=!!l||Lh(f),[v,S,w=[]]=Mh(u,{color:i??m,width:t??e??h,height:a??e??h,strokeWidth:n??x,absoluteStrokeWidth:r??g,nonScalingStroke:s??p,className:Qr(y,o),hasA11yProp:L,attributes:f});return $i(v,{ref:d,...S},[...w.map(([I,_])=>$i(I,_)),...Array.isArray(l)?l:[l]])});function ct(i,e=[],t=[]){let a=typeof i=="string"?bh(i,e,t):i,n=Po(({className:r,...s},o)=>$i(Ih,{ref:o,icon:a,className:r,...s}));return a.name&&(n.displayName=Sh(a.name)),n}var Th={name:"arrow-right",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]};Th.node;var Xa=ct(Th);var Ah={name:"arrow-up-right",size:24,node:[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]};Ah.node;var jr=ct(Ah);var Eh={name:"check",size:24,node:[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]};Eh.node;var yi=ct(Eh);var Rh={name:"earth",size:24,node:[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54",key:"1djwo0"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",key:"1tzkfa"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05",key:"14pb5j"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],aliases:["globe-2"]};Rh.node;var Zn=ct(Rh);var Ph={name:"globe",size:24,node:[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]};Ph.node;var es=ct(Ph);var Dh={name:"graduation-cap",size:24,node:[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]]};Dh.node;var Si=ct(Dh);var Fh={name:"layers",size:24,node:[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],aliases:["layers-3"]};Fh.node;var sn=ct(Fh);var kh={name:"menu",size:24,node:[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]};kh.node;var ts=ct(kh);var Uh={name:"plus",size:24,node:[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]};Uh.node;var Qi=ct(Uh);var Nh={name:"puzzle",size:24,node:[["path",{d:"M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z",key:"w46dr5"}]]};Nh.node;var as=ct(Nh);var Bh={name:"scissors",size:24,node:[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]};Bh.node;var wi=ct(Bh);var Oh={name:"shield-check",size:24,node:[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]};Oh.node;var Tn=ct(Oh);var zh={name:"sparkles",size:24,node:[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],aliases:["stars"]};zh.node;var Fa=ct(zh);var Hh={name:"users",size:24,node:[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]};Hh.node;var ns=ct(Hh);var Vh={name:"utensils",size:24,node:[["path",{d:"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2",key:"cjf0a3"}],["path",{d:"M7 2v20",key:"1473qp"}],["path",{d:"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",key:"j28e5"}]],aliases:["fork-knife"]};Vh.node;var on=ct(Vh);var Gh={name:"x",size:24,node:[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]};Gh.node;var is=ct(Gh);var Mt={slope:.38,barW:184,barH:50,radius:20,topY:88,midY:172,midX:10,botY:250,dot:{x:33,y:187,r:30},cut:38,yMin:18,yMax:300},Wh=Math.atan(Mt.slope)*180/Math.PI,qh="-2 14 188 290",D1=188/290,Xh=(()=>{let{x:i,y:e}=Mt.dot,t=Mt.cut;return`M-50 -50H350V450H-50Z M${i} ${e-t}a${t} ${t} 0 1 0 0 ${2*t}a${t} ${t} 0 1 0 0 ${-2*t}Z`})();var xu=globalThis[Symbol.for("ncr.public-home.react")].jsx,Do=xu.Fragment,P=xu.jsx,re=xu.jsxs;function _u({className:i="",ink:e="#0b0d12",accent:t="#0a6cff"}){let a="ncr"+_h().replace(/[^a-zA-Z0-9]/g,""),n=`skewY(${-Wh})`,{barW:r,barH:s,radius:o,topY:l,midY:c,midX:u,botY:f,dot:d}=Mt;return re("svg",{viewBox:qh,className:i,"aria-hidden":"true",focusable:"false",children:[P("defs",{children:P("clipPath",{id:a,children:P("path",{d:Xh,clipRule:"evenodd"})})}),re("g",{fill:e,children:[P("rect",{x:0,y:l,width:r,height:s,rx:o,transform:n}),P("g",{clipPath:`url(#${a})`,children:P("rect",{x:u,y:c,width:r-u,height:s,rx:o,transform:n})}),P("rect",{x:0,y:f,width:r,height:s,rx:o,transform:n})]}),P("circle",{cx:d.x,cy:d.y,r:d.r,fill:t})]})}function ji({dark:i=!1,className:e=""}){return re("span",{className:`inline-flex items-center gap-2.5 ${e}`,"aria-label":"NCR Suite",children:[P(_u,{ink:i?"#ffffff":"#0b0d12",className:"h-8 w-auto"}),re("span",{className:`text-[1.15rem] leading-none tracking-tight ${i?"text-white":"text-ink"}`,children:[P("span",{className:"font-extrabold",children:"NCR"})," ",P("span",{className:"font-normal text-brand",children:"Suite"})]})]})}var gt=[{key:"formation",label:"Formation",icon:"graduation",accent:"#2458c6",soft:"#edf3ff",title:"Du parcours \xE0 la preuve.",text:"Sessions, stagiaires, documents et \xE9margements : un environnement pens\xE9 pour les organismes de formation.",dashboard:"Pilotage de la formation",primary:"Cr\xE9er une session",metrics:["Sessions planifi\xE9es","Stagiaires","Dossiers \xE0 suivre","\xC9valuations"],features:["Sessions et stagiaires","\xC9margement num\xE9rique","Documents et preuves qualit\xE9"],nav:["Pilotage","Sessions","Stagiaires","Documents","\xC9valuations"],actions:["Pr\xE9parer une session","Suivre les \xE9margements","R\xE9unir les documents"],modules:["CRM et pipeline commercial","Catalogue et programmes","Sessions et \xE9margements","\xC9valuations automatis\xE9es","Facturation et BPF","Qualiopi et preuves"],path:"/logiciel-gestion-formation"},{key:"securite",label:"S\xE9curit\xE9 priv\xE9e",icon:"shield",accent:"#9b1c1c",soft:"#fff0f0",title:"Le bureau et le terrain, reli\xE9s.",text:"Agents, sites, vacations et rondes : une vision op\xE9rationnelle commune pour organiser et superviser la s\xE9curit\xE9.",dashboard:"Supervision des op\xE9rations",primary:"Planifier une vacation",metrics:["Vacations","Agents","Rondes","Rapports"],features:["Planning des vacations","Rondes QR et main courante","Supervision et alertes terrain"],nav:["Supervision","Agents","Sites","Vacations","Main courante"],actions:["Consulter les vacations","Suivre les rondes QR","Lire la main courante"],modules:["Clients, sites et contrats","Agents et agr\xE9ments","Planning et vacations","Rondes QR et PTI","Main courante terrain","Facturation et portail client"],path:"/logiciel-securite-privee"},{key:"nettoyage",label:"Nettoyage",icon:"sparkles",accent:"#287451",soft:"#edf8f2",title:"Chaque prestation laisse une trace.",text:"Interventions, agents terrain et contr\xF4les qualit\xE9 : les prestations se planifient, se suivent et se documentent par site.",dashboard:"Pilotage de l\u2019exploitation",primary:"Planifier une intervention",metrics:["Interventions","Agents terrain","Avancement","Contr\xF4les qualit\xE9"],features:["Interventions et pointage","Rapports et photos avant/apr\xE8s","Qualit\xE9 et suivi des stocks"],nav:["Exploitation","Interventions","Sites","Qualit\xE9","Stocks"],actions:["Planifier les interventions","Suivre les rapports","Contr\xF4ler la qualit\xE9"],modules:["Clients et sites","Agents et affectations","Pointage et consignes","Rapports et anomalies","Contr\xF4les qualit\xE9","Stocks et rentabilit\xE9"],path:"/logiciel-entreprise-nettoyage"},{key:"restauration",label:"Restauration",icon:"utensils",accent:"#94600e",soft:"#fff7e8",title:"Du couvert \xE0 la cuisine.",text:"R\xE9servations, \xE9quipe, carte, hygi\xE8ne et stocks : un environnement organis\xE9 autour du service et de l\u2019exploitation du restaurant.",dashboard:"Pilotage du restaurant",primary:"Nouvelle r\xE9servation",metrics:["R\xE9servations","\xC9quipe planifi\xE9e","Stocks","Hygi\xE8ne"],features:["R\xE9servations et plan de salle","Carte et \xE9cran cuisine","Hygi\xE8ne et stocks"],nav:["Restaurant","R\xE9servations","Carte","Cuisine","Hygi\xE8ne"],actions:["Organiser le service","Suivre la carte","Consulter les contr\xF4les"],modules:["R\xE9servations et plan de salle","Carte et recettes","Commandes et \xE9cran cuisine","Planning des \xE9quipes","Hygi\xE8ne et tra\xE7abilit\xE9","Stocks et pilotage"],path:"/logiciel-gestion-restaurant"},{key:"coiffure",label:"Coiffure & Beaut\xE9",icon:"scissors",accent:"#652052",soft:"#f8eff6",title:"Le rendez-vous au c\u0153ur du salon.",text:"Agenda, prestations, clients et collaborateurs : l\u2019accueil et l\u2019organisation du salon ou de l\u2019institut restent au m\xEAme endroit.",dashboard:"Votre salon, en un regard",primary:"Nouveau rendez-vous",metrics:["Rendez-vous","Clients","Prestations","Collaborateurs"],features:["Agenda et r\xE9servation en ligne","Prestations et collaborateurs","Fichier client et fid\xE9lit\xE9"],nav:["Salon","Agenda","Clients","Prestations","\xC9quipe"],actions:["Organiser les rendez-vous","Retrouver les fiches clients","G\xE9rer les prestations"],modules:["R\xE9servation en ligne","Planning du salon","Fichier client","Prestations et \xE9quipe","Fid\xE9lit\xE9 personnalis\xE9e","Espace client"],path:"/logiciel-coiffure"}],Fo=["Clients","\xC9quipes","Planning","Documents","Pilotage","Revenus selon l\u2019activit\xE9"];function er(i){let e=gt[i];return{"--vertical-accent":e?.accent??"#25344b","--vertical-soft":e?.soft??"#eef2f7","--vertical-glow":`${e?.accent??"#61728c"}20`}}var ln="",cn=`${ln}/demande-acces?essai=7&utm_source=vitrine&utm_medium=cta&utm_campaign=essai-7-jours&utm_content=accueil`,rs=`${ln}/connexion`,ko="mailto:contact@ncr-suite.fr",Kn=gt.map((i,e)=>({id:`univers-${i.key}`,title:i.title,text:i.text,points:i.features,view:e+1,label:i.label,accent:i.accent,soft:i.soft})),Yh=gt.map(i=>({key:i.key,title:i.label,text:i.text,tags:i.modules,icon:i.icon,accent:i.accent,path:i.path})),Zh=[{title:"NCR Suite",text:"Un socle commun, cinq environnements adapt\xE9s. Choisissez un m\xE9tier pour d\xE9couvrir ses usages."},...gt.map(i=>({title:i.label,text:i.text}))],Kh=[{title:"Un socle commun",text:"Clients, \xE9quipes, planning et documents circulent dans le m\xEAme environnement pour limiter les ressaisies.",icon:"layers"},{title:"Les bons outils m\xE9tier",text:"Les menus, indicateurs et automatisations suivent les op\xE9rations de votre secteur.",icon:"puzzle"},{title:"Bureau et terrain",text:"Une PWA accessible sur ordinateur et mobile pour accompagner les \xE9quipes l\xE0 o\xF9 elles travaillent.",icon:"globe"},{title:"Des acc\xE8s ma\xEEtris\xE9s",text:"\xC9quipes, clients, formateurs et intervenants disposent d\u2019espaces adapt\xE9s \xE0 leur r\xF4le, selon la formule et les modules.",icon:"shield"},{title:"Une \xE9volution lisible",text:"Commencez avec la formule adapt\xE9e. Le catalogue de modules et les offres sup\xE9rieures accompagnent ensuite vos besoins.",icon:"sparkles"}],Jh=[{q:"\xC0 qui s\u2019adresse NCR Suite ?",a:"NCR Suite propose cinq environnements : formation, s\xE9curit\xE9 priv\xE9e, nettoyage, restauration et coiffure-beaut\xE9. Chaque m\xE9tier dispose de ses outils, sur un socle commun."},{q:"Comment fonctionne l\u2019essai gratuit de 7 jours ?",a:"Vous pr\xE9sentez votre activit\xE9 dans le formulaire de demande. Apr\xE8s validation, vous testez la formule Professionnelle pendant 7 jours, sans carte bancaire et sans contrat d\u2019abonnement \xE0 signer au d\xE9marrage. Aucun compte n\u2019est cr\xE9\xE9 automatiquement."},{q:"Les m\xEAmes fonctions sont-elles incluses dans toutes les offres ?",a:"Non. Les fonctions et les acc\xE8s varient selon le m\xE9tier et la formule : D\xE9couverte, Essentielle, Professionnelle ou M\xE9tier. Le catalogue public d\xE9taille les principales inclusions. M\xE9tier est une offre sur mesure dont le tarif final est d\xE9fini avant l\u2019ouverture."},{q:"Puis-je utiliser NCR Suite sur mobile ?",a:"Oui. NCR Suite est pr\xE9sent\xE9e comme une PWA pour travailler sur ordinateur et mobile, au bureau comme sur le terrain."}],Uo=[{key:"formation",name:"Formation",items:[{q:"NCR Suite remplace-t-il plusieurs outils de formation ?",a:"NCR Suite r\xE9unit le suivi commercial, les sessions, les documents, les pr\xE9sences, les \xE9valuations, la facturation et les preuves qualit\xE9 dans un environnement coh\xE9rent."},{q:"Le BPF est-il pr\xE9par\xE9 automatiquement ?",a:"Les donn\xE9es de chiffre d\u2019affaires, stagiaires, heures, financeurs, formateurs et sous-traitance sont consolid\xE9es avec des contr\xF4les de coh\xE9rence et un export d\u2019aide \xE0 la saisie."},{q:"Les stagiaires et formateurs disposent-ils de leur espace ?",a:"Des portails d\xE9di\xE9s peuvent \xEAtre activ\xE9s pour les stagiaires, formateurs et clients, avec d\xE9p\xF4ts de pi\xE8ces, signatures et historique exploitable."},{q:"Peut-on commencer avec une petite formule ?",a:"Oui. Les formules progressent de D\xE9couverte \xE0 M\xE9tier et les modules disponibles restent visibles afin de choisir le bon niveau au moment utile."}]},{key:"securite",name:"S\xE9curit\xE9 priv\xE9e",items:[{q:"Les agents peuvent-ils utiliser NCR Suite sur t\xE9l\xE9phone ?",a:"Oui. L\u2019espace terrain permet de consulter planning et consignes, r\xE9aliser les rondes, alimenter la main courante et transmettre les preuves depuis une PWA mobile."},{q:"Le logiciel g\xE8re-t-il les rondes par QR code ?",a:"Les points de passage peuvent \xEAtre cr\xE9\xE9s et imprim\xE9s, puis chaque lecture est horodat\xE9e et rattach\xE9e \xE0 la vacation concern\xE9e."},{q:"Les clients disposent-ils d\u2019un portail ?",a:"Un portail client peut pr\xE9senter les missions, rapports, rondes, documents et messages autoris\xE9s pour chaque donneur d\u2019ordre."},{q:"Que deviennent les donn\xE9es lors d\u2019une baisse de formule ?",a:"Les droits premium sont retir\xE9s selon la formule, mais les donn\xE9es existantes sont conserv\xE9es pour pouvoir \xEAtre retrouv\xE9es lors d\u2019une remont\xE9e en gamme."}]},{key:"nettoyage",name:"Nettoyage",items:[{q:"Les agents ont-ils besoin d\u2019installer une application ?",a:"NCR Suite fonctionne comme une PWA : l\u2019espace terrain peut \xEAtre ajout\xE9 \xE0 l\u2019\xE9cran du t\xE9l\xE9phone et utilis\xE9 avec une exp\xE9rience proche d\u2019une application."},{q:"Peut-on envoyer des rapports aux clients ?",a:"Les rapports de visite, photos, anomalies et contr\xF4les qualit\xE9 peuvent \xEAtre rattach\xE9s au bon site et partag\xE9s depuis le portail client selon les droits accord\xE9s."},{q:"Comment la rentabilit\xE9 d\u2019un chantier est-elle calcul\xE9e ?",a:"Le module compare le chiffre d\u2019affaires pr\xE9vu avec les temps r\xE9alis\xE9s, les co\xFBts horaires et les consommables enregistr\xE9s."},{q:"NCR Suite convient-il au multiservice ?",a:"Les sites, protocoles, \xE9quipes, types d\u2019intervention et modules peuvent \xEAtre adapt\xE9s \xE0 une organisation de propret\xE9 ou de multiservices."}]},{key:"restauration",name:"Restauration",items:[{q:"NCR Suite g\xE8re-t-il les r\xE9servations en ligne ?",a:"Une page publique permet aux clients de r\xE9server, tandis que le restaurant suit les demandes, les confirmations et le plan de salle depuis son espace."},{q:"Le menu peut-il \xEAtre publi\xE9 avec un QR code ?",a:"Le menu public peut \xEAtre diffus\xE9 par QR code et pr\xE9sent\xE9 en plusieurs langues avec les informations utiles comme les allerg\xE8nes."},{q:"Peut-on suivre les commandes en cuisine ?",a:"L\u2019\xE9cran cuisine re\xE7oit les commandes et permet de suivre les \xE9tapes de pr\xE9paration jusqu\u2019\xE0 leur disponibilit\xE9 pour le service."},{q:"Les contr\xF4les HACCP sont-ils historis\xE9s ?",a:"Les temp\xE9ratures et checklists d\u2019hygi\xE8ne sont enregistr\xE9es avec leur date et restent consultables dans l\u2019historique de l\u2019\xE9tablissement."}]},{key:"coiffure",name:"Coiffure & beaut\xE9",items:[{q:"Les clients peuvent-ils r\xE9server depuis leur t\xE9l\xE9phone ?",a:"Oui. La page de r\xE9servation publique est adapt\xE9e au mobile et permet de choisir une prestation, un professionnel et un cr\xE9neau disponible."},{q:"Peut-on envoyer des rappels de rendez-vous ?",a:"Les confirmations et rappels automatiques peuvent \xEAtre activ\xE9s afin de pr\xE9venir les clients avant leur rendez-vous."},{q:"L\u2019\xE9quipe dispose-t-elle de plusieurs acc\xE8s ?",a:"Les formules sup\xE9rieures ajoutent des acc\xE8s \xE9quipe et des r\xF4les adapt\xE9s pour organiser le salon sans partager un identifiant unique."},{q:"Le logiciel convient-il aussi aux instituts de beaut\xE9 ?",a:"Les prestations, dur\xE9es, \xE9quipes, rendez-vous et parcours client peuvent \xEAtre configur\xE9s pour un salon de coiffure comme pour un institut."}]}];var $h=[{href:"#plateforme",label:"Univers"},{href:"#socle",label:"Socle"},{href:"#produit",label:"Produit"},{href:"#offres",label:"Offres"},{href:"#faq",label:"FAQ"}];function Qh({on:i,onToggle:e}){return re("button",{type:"button",role:"switch","aria-checked":i,onClick:e,title:"Activer ou d\xE9sactiver les effets 3D",className:"flex items-center gap-2 rounded-full px-2 py-1.5 text-[0.78rem] font-medium text-slate-600 transition hover:text-ink",children:[P("span",{children:"Effets 3D"}),P("span",{className:`relative h-[18px] w-8 rounded-full transition-colors ${i?"bg-brand":"bg-slate-300"}`,children:P("span",{className:`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${i?"left-[16px]":"left-[2px]"}`})})]})}function vu({effects:i,onToggle:e}){let[t,a]=wa(!1),[n,r]=wa(!1),s=at(null);return Ot(()=>{if(!n)return;let o=c=>{c.key==="Escape"&&(r(!1),s.current?.focus())},l=()=>{window.innerWidth>=1024&&r(!1)};return document.addEventListener("keydown",o),window.addEventListener("resize",l),()=>{document.removeEventListener("keydown",o),window.removeEventListener("resize",l)}},[n]),Ot(()=>{let o=!1,l=()=>{let c=window.scrollY>24;c!==o&&(o=c,a(c))};return l(),window.addEventListener("scroll",l,{passive:!0}),()=>window.removeEventListener("scroll",l)},[]),re("header",{className:"fixed inset-x-0 top-0 z-50",children:[P("a",{href:"#contenu",className:"sr-only-focusable absolute left-4 top-3 z-50 rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow",children:"Aller au contenu"}),re("div",{className:`mx-auto mt-3 flex h-14 w-[min(94vw,1180px)] items-center justify-between rounded-full px-4 pl-5 transition-all duration-500 ${t||n?"border border-white/70 bg-white/75 shadow-[0_10px_40px_-16px_rgba(16,24,40,0.3)] backdrop-blur-md":"border border-transparent bg-transparent"}`,children:[P("a",{href:"#plateforme","aria-label":"NCR Suite \u2014 accueil",children:P(ji,{})}),P("nav",{"aria-label":"Navigation principale",className:"hidden items-center gap-1 lg:flex",children:$h.map(o=>P("a",{href:o.href,className:"rounded-full px-3.5 py-2 text-[0.88rem] font-medium text-slate-600 transition hover:bg-black/5 hover:text-ink",children:o.label},o.href))}),re("div",{className:"flex items-center gap-1.5",children:[P("div",{className:"hidden lg:block",children:P(Qh,{on:i,onToggle:e})}),P("a",{href:rs,className:"hidden rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-black/5 xl:inline-flex",children:"Connexion"}),P("a",{href:cn,className:"btn btn-primary !h-9 !px-4 !text-[0.85rem]",children:"Essai 7 jours"}),P("button",{type:"button",className:"flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-black/5 lg:hidden","aria-label":n?"Fermer le menu":"Ouvrir le menu",ref:s,"aria-controls":"mobile-nav","aria-expanded":n,onClick:()=>r(o=>!o),children:n?P(is,{size:20}):P(ts,{size:20})})]})]}),n&&re("nav",{id:"mobile-nav","aria-label":"Menu mobile",className:"mx-auto mt-2 w-[min(94vw,1180px)] rounded-3xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-md lg:hidden",children:[$h.map(o=>P("a",{href:o.href,onClick:()=>r(!1),className:"block rounded-2xl px-4 py-3 text-base font-medium text-ink hover:bg-black/5",children:o.label},o.href)),P("a",{href:rs,className:"block rounded-2xl px-4 py-3 font-medium text-ink",children:"Se connecter"}),P("div",{className:"mt-1 border-t border-black/5 px-2 pt-2",children:P(Qh,{on:i,onToggle:e})})]})]})}function No(i){let e=0,t=1,a=()=>{let r=i.getBoundingClientRect();e=r.top+window.scrollY,t=r.height},n=new ResizeObserver(a);return n.observe(document.body),n.observe(i),window.addEventListener("resize",a,{passive:!0}),a(),{story:()=>Math.max(0,Math.min(1,(window.scrollY-e)/Math.max(1,t-window.innerHeight))),final:()=>Math.max(0,Math.min(1,(window.innerHeight+window.scrollY-e)/Math.max(1,t))),dispose:()=>{n.disconnect(),window.removeEventListener("resize",a)}}}var Rp=0,nd=1,Pp=2;var Ks=1,Dp=2,Er=3,oi=0,Kt=1,vn=2,bn=0,Rr=1,Js=2,id=3,rd=4,Fp=5;var Di=100,kp=101,Up=102,Np=103,Bp=104,Op=200,zp=201,Hp=202,Vp=203,sd=204,od=205,Gp=206,Wp=207,qp=208,Xp=209,Yp=210,Zp=211,Kp=212,Jp=213,$p=214,ul=0,dl=1,fl=2,xr=3,hl=4,pl=5,ml=6,gl=7,Xl=0,Qp=1,jp=2,Qa=0,ld=1,cd=2,ud=3,$s=4,dd=5,fd=6,hd=7;var pd=300,li=301,Fi=302,Yl=303,Zl=304,Qs=306,xl=1e3,dn=1001,_l=1002,Yt=1003,em=1004;var js=1005;var Ht=1006,Kl=1007;var yn=1008;var xa=1009,md=1010,gd=1011,Pr=1012,Jl=1013,ja=1014,Ba=1015,en=1016,$l=1017,Ql=1018,Dr=1020,xd=35902,_d=35899,vd=1021,bd=1022,Oa=1023,fn=1026,ci=1027,jl=1028,ec=1029,ui=1030,tc=1031;var ac=1033,eo=33776,to=33777,ao=33778,no=33779,nc=35840,ic=35841,rc=35842,sc=35843,oc=36196,lc=37492,cc=37496,uc=37488,dc=37489,io=37490,fc=37491,hc=37808,pc=37809,mc=37810,gc=37811,xc=37812,_c=37813,vc=37814,bc=37815,yc=37816,Sc=37817,wc=37818,Mc=37819,Lc=37820,Cc=37821,Ic=36492,Tc=36494,Ac=36495,Ec=36283,Rc=36284,ro=36285,Pc=36286;var xs=2300,vl=2301,ll=2302,Wu=2303,qu=2400,Xu=2401,Yu=2402;var tm=3200;var so=0,am=1,Bn="",Xt="srgb",_s="srgb-linear",vs="linear",ht="srgb";var cl=7680;var nm=519,im=512,rm=513,sm=514,Dc=515,om=516,lm=517,Fc=518,cm=519,um=35044;var yd="300 es",$a=2e3,_r=2001;function Mx(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Lx(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function bs(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function dm(){let i=bs("canvas");return i.style.display="block",i}var jh={},vr=null;function Sd(...i){let e="THREE."+i.shift();vr?vr("log",e,...i):console.log(e,...i)}function fm(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Oe(...i){i=fm(i);let e="THREE."+i.shift();if(vr)vr("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function He(...i){i=fm(i);let e="THREE."+i.shift();if(vr)vr("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function Ai(...i){let e=i.join(" ");e in jh||(jh[e]=!0,Oe(...i))}function hm(i,e,t){return new Promise(function(a,n){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:n();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:a()}}setTimeout(r,t)})}var pm={[ul]:dl,[fl]:ml,[hl]:gl,[xr]:pl,[dl]:ul,[ml]:fl,[gl]:hl,[pl]:xr},hn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let a=this._listeners;a[e]===void 0&&(a[e]=[]),a[e].indexOf(t)===-1&&a[e].push(t)}hasEventListener(e,t){let a=this._listeners;return a===void 0?!1:a[e]!==void 0&&a[e].indexOf(t)!==-1}removeEventListener(e,t){let a=this._listeners;if(a===void 0)return;let n=a[e];if(n!==void 0){let r=n.indexOf(t);r!==-1&&n.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let a=t[e.type];if(a!==void 0){e.target=this;let n=a.slice(0);for(let r=0,s=n.length;r<s;r++)n[r].call(this,e);e.target=null}}},ea=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],ep=1234567,hs=Math.PI/180,br=180/Math.PI;function ki(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,a=Math.random()*4294967295|0;return(ea[i&255]+ea[i>>8&255]+ea[i>>16&255]+ea[i>>24&255]+"-"+ea[e&255]+ea[e>>8&255]+"-"+ea[e>>16&15|64]+ea[e>>24&255]+"-"+ea[t&63|128]+ea[t>>8&255]+"-"+ea[t>>16&255]+ea[t>>24&255]+ea[a&255]+ea[a>>8&255]+ea[a>>16&255]+ea[a>>24&255]).toLowerCase()}function je(i,e,t){return Math.max(e,Math.min(t,i))}function wd(i,e){return(i%e+e)%e}function Cx(i,e,t,a,n){return a+(i-e)*(n-a)/(t-e)}function Ix(i,e,t){return i!==e?(t-i)/(e-i):0}function ps(i,e,t){return(1-t)*i+t*e}function Tx(i,e,t,a){return ps(i,e,1-Math.exp(-t*a))}function Ax(i,e=1){return e-Math.abs(wd(i,e*2)-e)}function Ex(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Rx(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Px(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Dx(i,e){return i+Math.random()*(e-i)}function Fx(i){return i*(.5-Math.random())}function kx(i){i!==void 0&&(ep=i);let e=ep+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Ux(i){return i*hs}function Nx(i){return i*br}function Bx(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Ox(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function zx(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Hx(i,e,t,a,n){let r=Math.cos,s=Math.sin,o=r(t/2),l=s(t/2),c=r((e+a)/2),u=s((e+a)/2),f=r((e-a)/2),d=s((e-a)/2),h=r((a-e)/2),x=s((a-e)/2);switch(n){case"XYX":i.set(o*u,l*f,l*d,o*c);break;case"YZY":i.set(l*d,o*u,l*f,o*c);break;case"ZXZ":i.set(l*f,l*d,o*u,o*c);break;case"XZX":i.set(o*u,l*x,l*h,o*c);break;case"YXY":i.set(l*h,o*u,l*x,o*c);break;case"ZYZ":i.set(l*x,l*h,o*u,o*c);break;default:Oe("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+n)}}function mr(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function da(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Fr={DEG2RAD:hs,RAD2DEG:br,generateUUID:ki,clamp:je,euclideanModulo:wd,mapLinear:Cx,inverseLerp:Ix,lerp:ps,damp:Tx,pingpong:Ax,smoothstep:Ex,smootherstep:Rx,randInt:Px,randFloat:Dx,randFloatSpread:Fx,seededRandom:kx,degToRad:Ux,radToDeg:Nx,isPowerOfTwo:Bx,ceilPowerOfTwo:Ox,floorPowerOfTwo:zx,setQuaternionFromProperEuler:Hx,normalize:da,denormalize:mr},Ad=class Ad{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,a=this.y,n=e.elements;return this.x=n[0]*t+n[3]*a+n[6],this.y=n[1]*t+n[4]*a+n[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=je(this.x,e.x,t.x),this.y=je(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=je(this.x,e,t),this.y=je(this.y,e,t),this}clampLength(e,t){let a=this.length();return this.divideScalar(a||1).multiplyScalar(je(a,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let a=this.dot(e)/t;return Math.acos(je(a,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,a=this.y-e.y;return t*t+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,a){return this.x=e.x+(t.x-e.x)*a,this.y=e.y+(t.y-e.y)*a,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let a=Math.cos(t),n=Math.sin(t),r=this.x-e.x,s=this.y-e.y;return this.x=r*a-s*n+e.x,this.y=r*n+s*a+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Ad.prototype.isVector2=!0;var fe=Ad,pn=class{constructor(e=0,t=0,a=0,n=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=a,this._w=n}static slerpFlat(e,t,a,n,r,s,o){let l=a[n+0],c=a[n+1],u=a[n+2],f=a[n+3],d=r[s+0],h=r[s+1],x=r[s+2],g=r[s+3];if(f!==g||l!==d||c!==h||u!==x){let p=l*d+c*h+u*x+f*g;p<0&&(d=-d,h=-h,x=-x,g=-g,p=-p);let m=1-o;if(p<.9995){let y=Math.acos(p),L=Math.sin(y);m=Math.sin(m*y)/L,o=Math.sin(o*y)/L,l=l*m+d*o,c=c*m+h*o,u=u*m+x*o,f=f*m+g*o}else{l=l*m+d*o,c=c*m+h*o,u=u*m+x*o,f=f*m+g*o;let y=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=y,c*=y,u*=y,f*=y}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,a,n,r,s){let o=a[n],l=a[n+1],c=a[n+2],u=a[n+3],f=r[s],d=r[s+1],h=r[s+2],x=r[s+3];return e[t]=o*x+u*f+l*h-c*d,e[t+1]=l*x+u*d+c*f-o*h,e[t+2]=c*x+u*h+o*d-l*f,e[t+3]=u*x-o*f-l*d-c*h,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,a,n){return this._x=e,this._y=t,this._z=a,this._w=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let a=e._x,n=e._y,r=e._z,s=e._order,o=Math.cos,l=Math.sin,c=o(a/2),u=o(n/2),f=o(r/2),d=l(a/2),h=l(n/2),x=l(r/2);switch(s){case"XYZ":this._x=d*u*f+c*h*x,this._y=c*h*f-d*u*x,this._z=c*u*x+d*h*f,this._w=c*u*f-d*h*x;break;case"YXZ":this._x=d*u*f+c*h*x,this._y=c*h*f-d*u*x,this._z=c*u*x-d*h*f,this._w=c*u*f+d*h*x;break;case"ZXY":this._x=d*u*f-c*h*x,this._y=c*h*f+d*u*x,this._z=c*u*x+d*h*f,this._w=c*u*f-d*h*x;break;case"ZYX":this._x=d*u*f-c*h*x,this._y=c*h*f+d*u*x,this._z=c*u*x-d*h*f,this._w=c*u*f+d*h*x;break;case"YZX":this._x=d*u*f+c*h*x,this._y=c*h*f+d*u*x,this._z=c*u*x-d*h*f,this._w=c*u*f-d*h*x;break;case"XZY":this._x=d*u*f-c*h*x,this._y=c*h*f-d*u*x,this._z=c*u*x+d*h*f,this._w=c*u*f+d*h*x;break;default:Oe("Quaternion: .setFromEuler() encountered an unknown order: "+s)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let a=t/2,n=Math.sin(a);return this._x=e.x*n,this._y=e.y*n,this._z=e.z*n,this._w=Math.cos(a),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,a=t[0],n=t[4],r=t[8],s=t[1],o=t[5],l=t[9],c=t[2],u=t[6],f=t[10],d=a+o+f;if(d>0){let h=.5/Math.sqrt(d+1);this._w=.25/h,this._x=(u-l)*h,this._y=(r-c)*h,this._z=(s-n)*h}else if(a>o&&a>f){let h=2*Math.sqrt(1+a-o-f);this._w=(u-l)/h,this._x=.25*h,this._y=(n+s)/h,this._z=(r+c)/h}else if(o>f){let h=2*Math.sqrt(1+o-a-f);this._w=(r-c)/h,this._x=(n+s)/h,this._y=.25*h,this._z=(l+u)/h}else{let h=2*Math.sqrt(1+f-a-o);this._w=(s-n)/h,this._x=(r+c)/h,this._y=(l+u)/h,this._z=.25*h}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let a=e.dot(t)+1;return a<1e-8?(a=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=a):(this._x=0,this._y=-e.z,this._z=e.y,this._w=a)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=a),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(je(this.dot(e),-1,1)))}rotateTowards(e,t){let a=this.angleTo(e);if(a===0)return this;let n=Math.min(1,t/a);return this.slerp(e,n),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let a=e._x,n=e._y,r=e._z,s=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=a*u+s*o+n*c-r*l,this._y=n*u+s*l+r*o-a*c,this._z=r*u+s*c+a*l-n*o,this._w=s*u-a*o-n*l-r*c,this._onChangeCallback(),this}slerp(e,t){let a=e._x,n=e._y,r=e._z,s=e._w,o=this.dot(e);o<0&&(a=-a,n=-n,r=-r,s=-s,o=-o);let l=1-t;if(o<.9995){let c=Math.acos(o),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+a*t,this._y=this._y*l+n*t,this._z=this._z*l+r*t,this._w=this._w*l+s*t,this._onChangeCallback()}else this._x=this._x*l+a*t,this._y=this._y*l+n*t,this._z=this._z*l+r*t,this._w=this._w*l+s*t,this.normalize();return this}slerpQuaternions(e,t,a){return this.copy(e).slerp(t,a)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),a=Math.random(),n=Math.sqrt(1-a),r=Math.sqrt(a);return this.set(n*Math.sin(e),n*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},Ed=class Ed{constructor(e=0,t=0,a=0){this.x=e,this.y=t,this.z=a}set(e,t,a){return a===void 0&&(a=this.z),this.x=e,this.y=t,this.z=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(tp.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(tp.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,a=this.y,n=this.z,r=e.elements;return this.x=r[0]*t+r[3]*a+r[6]*n,this.y=r[1]*t+r[4]*a+r[7]*n,this.z=r[2]*t+r[5]*a+r[8]*n,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,a=this.y,n=this.z,r=e.elements,s=1/(r[3]*t+r[7]*a+r[11]*n+r[15]);return this.x=(r[0]*t+r[4]*a+r[8]*n+r[12])*s,this.y=(r[1]*t+r[5]*a+r[9]*n+r[13])*s,this.z=(r[2]*t+r[6]*a+r[10]*n+r[14])*s,this}applyQuaternion(e){let t=this.x,a=this.y,n=this.z,r=e.x,s=e.y,o=e.z,l=e.w,c=2*(s*n-o*a),u=2*(o*t-r*n),f=2*(r*a-s*t);return this.x=t+l*c+s*f-o*u,this.y=a+l*u+o*c-r*f,this.z=n+l*f+r*u-s*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,a=this.y,n=this.z,r=e.elements;return this.x=r[0]*t+r[4]*a+r[8]*n,this.y=r[1]*t+r[5]*a+r[9]*n,this.z=r[2]*t+r[6]*a+r[10]*n,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=je(this.x,e.x,t.x),this.y=je(this.y,e.y,t.y),this.z=je(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=je(this.x,e,t),this.y=je(this.y,e,t),this.z=je(this.z,e,t),this}clampLength(e,t){let a=this.length();return this.divideScalar(a||1).multiplyScalar(je(a,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,a){return this.x=e.x+(t.x-e.x)*a,this.y=e.y+(t.y-e.y)*a,this.z=e.z+(t.z-e.z)*a,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let a=e.x,n=e.y,r=e.z,s=t.x,o=t.y,l=t.z;return this.x=n*l-r*o,this.y=r*s-a*l,this.z=a*o-n*s,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let a=e.dot(this)/t;return this.copy(e).multiplyScalar(a)}projectOnPlane(e){return bu.copy(this).projectOnVector(e),this.sub(bu)}reflect(e){return this.sub(bu.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let a=this.dot(e)/t;return Math.acos(je(a,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,a=this.y-e.y,n=this.z-e.z;return t*t+a*a+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,a){let n=Math.sin(t)*e;return this.x=n*Math.sin(a),this.y=Math.cos(t)*e,this.z=n*Math.cos(a),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,a){return this.x=e*Math.sin(t),this.y=a,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),a=this.setFromMatrixColumn(e,1).length(),n=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=a,this.z=n,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,a=Math.sqrt(1-t*t);return this.x=a*Math.cos(e),this.y=t,this.z=a*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Ed.prototype.isVector3=!0;var O=Ed,bu=new O,tp=new pn,Rd=class Rd{constructor(e,t,a,n,r,s,o,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,a,n,r,s,o,l,c)}set(e,t,a,n,r,s,o,l,c){let u=this.elements;return u[0]=e,u[1]=n,u[2]=o,u[3]=t,u[4]=r,u[5]=l,u[6]=a,u[7]=s,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,a=e.elements;return t[0]=a[0],t[1]=a[1],t[2]=a[2],t[3]=a[3],t[4]=a[4],t[5]=a[5],t[6]=a[6],t[7]=a[7],t[8]=a[8],this}extractBasis(e,t,a){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),a.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let a=e.elements,n=t.elements,r=this.elements,s=a[0],o=a[3],l=a[6],c=a[1],u=a[4],f=a[7],d=a[2],h=a[5],x=a[8],g=n[0],p=n[3],m=n[6],y=n[1],L=n[4],v=n[7],S=n[2],w=n[5],I=n[8];return r[0]=s*g+o*y+l*S,r[3]=s*p+o*L+l*w,r[6]=s*m+o*v+l*I,r[1]=c*g+u*y+f*S,r[4]=c*p+u*L+f*w,r[7]=c*m+u*v+f*I,r[2]=d*g+h*y+x*S,r[5]=d*p+h*L+x*w,r[8]=d*m+h*v+x*I,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],a=e[1],n=e[2],r=e[3],s=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*s*u-t*o*c-a*r*u+a*o*l+n*r*c-n*s*l}invert(){let e=this.elements,t=e[0],a=e[1],n=e[2],r=e[3],s=e[4],o=e[5],l=e[6],c=e[7],u=e[8],f=u*s-o*c,d=o*l-u*r,h=c*r-s*l,x=t*f+a*d+n*h;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/x;return e[0]=f*g,e[1]=(n*c-u*a)*g,e[2]=(o*a-n*s)*g,e[3]=d*g,e[4]=(u*t-n*l)*g,e[5]=(n*r-o*t)*g,e[6]=h*g,e[7]=(a*l-c*t)*g,e[8]=(s*t-a*r)*g,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,a,n,r,s,o){let l=Math.cos(r),c=Math.sin(r);return this.set(a*l,a*c,-a*(l*s+c*o)+s+e,-n*c,n*l,-n*(-c*s+l*o)+o+t,0,0,1),this}scale(e,t){return Ai("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(yu.makeScale(e,t)),this}rotate(e){return Ai("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(yu.makeRotation(-e)),this}translate(e,t){return Ai("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(yu.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),a=Math.sin(e);return this.set(t,-a,0,a,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,a=e.elements;for(let n=0;n<9;n++)if(t[n]!==a[n])return!1;return!0}fromArray(e,t=0){for(let a=0;a<9;a++)this.elements[a]=e[a+t];return this}toArray(e=[],t=0){let a=this.elements;return e[t]=a[0],e[t+1]=a[1],e[t+2]=a[2],e[t+3]=a[3],e[t+4]=a[4],e[t+5]=a[5],e[t+6]=a[6],e[t+7]=a[7],e[t+8]=a[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Rd.prototype.isMatrix3=!0;var Ye=Rd,yu=new Ye,ap=new Ye().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),np=new Ye().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Vx(){let i={enabled:!0,workingColorSpace:_s,spaces:{},convert:function(n,r,s){return this.enabled===!1||r===s||!r||!s||(this.spaces[r].transfer===ht&&(n.r=Fn(n.r),n.g=Fn(n.g),n.b=Fn(n.b)),this.spaces[r].primaries!==this.spaces[s].primaries&&(n.applyMatrix3(this.spaces[r].toXYZ),n.applyMatrix3(this.spaces[s].fromXYZ)),this.spaces[s].transfer===ht&&(n.r=gr(n.r),n.g=gr(n.g),n.b=gr(n.b))),n},workingToColorSpace:function(n,r){return this.convert(n,this.workingColorSpace,r)},colorSpaceToWorking:function(n,r){return this.convert(n,r,this.workingColorSpace)},getPrimaries:function(n){return this.spaces[n].primaries},getTransfer:function(n){return n===Bn?vs:this.spaces[n].transfer},getToneMappingMode:function(n){return this.spaces[n].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(n,r=this.workingColorSpace){return n.fromArray(this.spaces[r].luminanceCoefficients)},define:function(n){Object.assign(this.spaces,n)},_getMatrix:function(n,r,s){return n.copy(this.spaces[r].toXYZ).multiply(this.spaces[s].fromXYZ)},_getDrawingBufferColorSpace:function(n){return this.spaces[n].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(n=this.workingColorSpace){return this.spaces[n].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(n,r){return Ai("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(n,r)},toWorkingColorSpace:function(n,r){return Ai("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(n,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],a=[.3127,.329];return i.define({[_s]:{primaries:e,whitePoint:a,transfer:vs,toXYZ:ap,fromXYZ:np,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Xt},outputColorSpaceConfig:{drawingBufferColorSpace:Xt}},[Xt]:{primaries:e,whitePoint:a,transfer:ht,toXYZ:ap,fromXYZ:np,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Xt}}}),i}var rt=Vx();function Fn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function gr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var tr,bl=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let a;if(e instanceof HTMLCanvasElement)a=e;else{tr===void 0&&(tr=bs("canvas")),tr.width=e.width,tr.height=e.height;let n=tr.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),a=tr}return a.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=bs("canvas");t.width=e.width,t.height=e.height;let a=t.getContext("2d");a.drawImage(e,0,0,e.width,e.height);let n=a.getImageData(0,0,e.width,e.height),r=n.data;for(let s=0;s<r.length;s++)r[s]=Fn(r[s]/255)*255;return a.putImageData(n,0,0),t}else if(e.data){let t=e.data.slice(0);for(let a=0;a<t.length;a++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[a]=Math.floor(Fn(t[a]/255)*255):t[a]=Fn(t[a]);return{data:t,width:e.width,height:e.height}}else return Oe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Gx=0,yr=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Gx++}),this.uuid=ki(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let a={uuid:this.uuid,url:""},n=this.data;if(n!==null){let r;if(Array.isArray(n)){r=[];for(let s=0,o=n.length;s<o;s++)n[s].isDataTexture?r.push(Su(n[s].image)):r.push(Su(n[s]))}else r=Su(n);a.url=r}return t||(e.images[this.uuid]=a),a}};function Su(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?bl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Oe("Texture: Unable to serialize Texture."),{})}var Wx=0,wu=new O,ha=class i extends hn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,a=dn,n=dn,r=Ht,s=yn,o=Oa,l=xa,c=i.DEFAULT_ANISOTROPY,u=Bn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Wx++}),this.uuid=ki(),this.name="",this.source=new yr(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=a,this.wrapT=n,this.magFilter=r,this.minFilter=s,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new fe(0,0),this.repeat=new fe(1,1),this.center=new fe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ye,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(wu).x}get height(){return this.source.getSize(wu).y}get depth(){return this.source.getSize(wu).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let a=e[t];if(a===void 0){Oe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let n=this[t];if(n===void 0){Oe(`Texture.setValues(): property '${t}' does not exist.`);continue}n&&a&&n.isVector2&&a.isVector2||n&&a&&n.isVector3&&a.isVector3||n&&a&&n.isMatrix3&&a.isMatrix3?n.copy(a):this[t]=a}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let a={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(a.userData=this.userData),t||(e.textures[this.uuid]=a),a}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==pd)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case xl:e.x=e.x-Math.floor(e.x);break;case dn:e.x=e.x<0?0:1;break;case _l:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case xl:e.y=e.y-Math.floor(e.y);break;case dn:e.y=e.y<0?0:1;break;case _l:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};ha.DEFAULT_IMAGE=null;ha.DEFAULT_MAPPING=pd;ha.DEFAULT_ANISOTROPY=1;var Pd=class Pd{constructor(e=0,t=0,a=0,n=1){this.x=e,this.y=t,this.z=a,this.w=n}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,a,n){return this.x=e,this.y=t,this.z=a,this.w=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,a=this.y,n=this.z,r=this.w,s=e.elements;return this.x=s[0]*t+s[4]*a+s[8]*n+s[12]*r,this.y=s[1]*t+s[5]*a+s[9]*n+s[13]*r,this.z=s[2]*t+s[6]*a+s[10]*n+s[14]*r,this.w=s[3]*t+s[7]*a+s[11]*n+s[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,a,n,r,l=e.elements,c=l[0],u=l[4],f=l[8],d=l[1],h=l[5],x=l[9],g=l[2],p=l[6],m=l[10];if(Math.abs(u-d)<.01&&Math.abs(f-g)<.01&&Math.abs(x-p)<.01){if(Math.abs(u+d)<.1&&Math.abs(f+g)<.1&&Math.abs(x+p)<.1&&Math.abs(c+h+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let L=(c+1)/2,v=(h+1)/2,S=(m+1)/2,w=(u+d)/4,I=(f+g)/4,_=(x+p)/4;return L>v&&L>S?L<.01?(a=0,n=.707106781,r=.707106781):(a=Math.sqrt(L),n=w/a,r=I/a):v>S?v<.01?(a=.707106781,n=0,r=.707106781):(n=Math.sqrt(v),a=w/n,r=_/n):S<.01?(a=.707106781,n=.707106781,r=0):(r=Math.sqrt(S),a=I/r,n=_/r),this.set(a,n,r,t),this}let y=Math.sqrt((p-x)*(p-x)+(f-g)*(f-g)+(d-u)*(d-u));return Math.abs(y)<.001&&(y=1),this.x=(p-x)/y,this.y=(f-g)/y,this.z=(d-u)/y,this.w=Math.acos((c+h+m-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=je(this.x,e.x,t.x),this.y=je(this.y,e.y,t.y),this.z=je(this.z,e.z,t.z),this.w=je(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=je(this.x,e,t),this.y=je(this.y,e,t),this.z=je(this.z,e,t),this.w=je(this.w,e,t),this}clampLength(e,t){let a=this.length();return this.divideScalar(a||1).multiplyScalar(je(a,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,a){return this.x=e.x+(t.x-e.x)*a,this.y=e.y+(t.y-e.y)*a,this.z=e.z+(t.z-e.z)*a,this.w=e.w+(t.w-e.w)*a,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Pd.prototype.isVector4=!0;var Ct=Pd,yl=class extends hn{constructor(e=1,t=1,a={}){super(),a=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ht,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},a),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=a.depth,this.scissor=new Ct(0,0,e,t),this.scissorTest=!1,this.viewport=new Ct(0,0,e,t),this.textures=[];let n={width:e,height:t,depth:a.depth},r=new ha(n),s=a.count;for(let o=0;o<s;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(a),this.depthBuffer=a.depthBuffer,this.stencilBuffer=a.stencilBuffer,this.resolveColorBuffer=a.resolveColorBuffer,this.resolveDepthBuffer=a.resolveDepthBuffer,this.resolveStencilBuffer=a.resolveStencilBuffer,this.storeMultisampledColorBuffer=a.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=a.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=a.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=a.depthTexture,this.samples=a.samples,this.multiview=a.multiview,this.useArrayDepthTexture=a.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Ht,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let a=0;a<this.textures.length;a++)this.textures[a].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,a=1){if(this.width!==e||this.height!==t||this.depth!==a){this.width=e,this.height=t,this.depth=a;for(let n=0,r=this.textures.length;n<r;n++)this.textures[n].image.width=e,this.textures[n].image.height=t,this.textures[n].image.depth=a,this.textures[n].isData3DTexture!==!0&&(this.textures[n].isArrayTexture=this.textures[n].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,a=e.textures.length;t<a;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new yr(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},ga=class extends yl{constructor(e=1,t=1,a={}){super(e,t,a),this.isWebGLRenderTarget=!0}},ys=class extends ha{constructor(e=null,t=1,a=1,n=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:a,depth:n},this.magFilter=Yt,this.minFilter=Yt,this.wrapR=dn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Sl=class extends ha{constructor(e=null,t=1,a=1,n=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:a,depth:n},this.magFilter=Yt,this.minFilter=Yt,this.wrapR=dn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}};var ql=class ql{constructor(e,t,a,n,r,s,o,l,c,u,f,d,h,x,g,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,a,n,r,s,o,l,c,u,f,d,h,x,g,p)}set(e,t,a,n,r,s,o,l,c,u,f,d,h,x,g,p){let m=this.elements;return m[0]=e,m[4]=t,m[8]=a,m[12]=n,m[1]=r,m[5]=s,m[9]=o,m[13]=l,m[2]=c,m[6]=u,m[10]=f,m[14]=d,m[3]=h,m[7]=x,m[11]=g,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ql().fromArray(this.elements)}copy(e){let t=this.elements,a=e.elements;return t[0]=a[0],t[1]=a[1],t[2]=a[2],t[3]=a[3],t[4]=a[4],t[5]=a[5],t[6]=a[6],t[7]=a[7],t[8]=a[8],t[9]=a[9],t[10]=a[10],t[11]=a[11],t[12]=a[12],t[13]=a[13],t[14]=a[14],t[15]=a[15],this}copyPosition(e){let t=this.elements,a=e.elements;return t[12]=a[12],t[13]=a[13],t[14]=a[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,a){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),a.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),a.setFromMatrixColumn(this,2),this)}makeBasis(e,t,a){return this.set(e.x,t.x,a.x,0,e.y,t.y,a.y,0,e.z,t.z,a.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,a=e.elements,n=1/ar.setFromMatrixColumn(e,0).length(),r=1/ar.setFromMatrixColumn(e,1).length(),s=1/ar.setFromMatrixColumn(e,2).length();return t[0]=a[0]*n,t[1]=a[1]*n,t[2]=a[2]*n,t[3]=0,t[4]=a[4]*r,t[5]=a[5]*r,t[6]=a[6]*r,t[7]=0,t[8]=a[8]*s,t[9]=a[9]*s,t[10]=a[10]*s,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,a=e.x,n=e.y,r=e.z,s=Math.cos(a),o=Math.sin(a),l=Math.cos(n),c=Math.sin(n),u=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){let d=s*u,h=s*f,x=o*u,g=o*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=h+x*c,t[5]=d-g*c,t[9]=-o*l,t[2]=g-d*c,t[6]=x+h*c,t[10]=s*l}else if(e.order==="YXZ"){let d=l*u,h=l*f,x=c*u,g=c*f;t[0]=d+g*o,t[4]=x*o-h,t[8]=s*c,t[1]=s*f,t[5]=s*u,t[9]=-o,t[2]=h*o-x,t[6]=g+d*o,t[10]=s*l}else if(e.order==="ZXY"){let d=l*u,h=l*f,x=c*u,g=c*f;t[0]=d-g*o,t[4]=-s*f,t[8]=x+h*o,t[1]=h+x*o,t[5]=s*u,t[9]=g-d*o,t[2]=-s*c,t[6]=o,t[10]=s*l}else if(e.order==="ZYX"){let d=s*u,h=s*f,x=o*u,g=o*f;t[0]=l*u,t[4]=x*c-h,t[8]=d*c+g,t[1]=l*f,t[5]=g*c+d,t[9]=h*c-x,t[2]=-c,t[6]=o*l,t[10]=s*l}else if(e.order==="YZX"){let d=s*l,h=s*c,x=o*l,g=o*c;t[0]=l*u,t[4]=g-d*f,t[8]=x*f+h,t[1]=f,t[5]=s*u,t[9]=-o*u,t[2]=-c*u,t[6]=h*f+x,t[10]=d-g*f}else if(e.order==="XZY"){let d=s*l,h=s*c,x=o*l,g=o*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=d*f+g,t[5]=s*u,t[9]=h*f-x,t[2]=x*f-h,t[6]=o*u,t[10]=g*f+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(qx,e,Xx)}lookAt(e,t,a){let n=this.elements;return Ma.subVectors(e,t),Ma.lengthSq()===0&&(Ma.z=1),Ma.normalize(),Jn.crossVectors(a,Ma),Jn.lengthSq()===0&&(Math.abs(a.z)===1?Ma.x+=1e-4:Ma.z+=1e-4,Ma.normalize(),Jn.crossVectors(a,Ma)),Jn.normalize(),Bo.crossVectors(Ma,Jn),n[0]=Jn.x,n[4]=Bo.x,n[8]=Ma.x,n[1]=Jn.y,n[5]=Bo.y,n[9]=Ma.y,n[2]=Jn.z,n[6]=Bo.z,n[10]=Ma.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let a=e.elements,n=t.elements,r=this.elements,s=a[0],o=a[4],l=a[8],c=a[12],u=a[1],f=a[5],d=a[9],h=a[13],x=a[2],g=a[6],p=a[10],m=a[14],y=a[3],L=a[7],v=a[11],S=a[15],w=n[0],I=n[4],_=n[8],C=n[12],A=n[1],E=n[5],F=n[9],U=n[13],R=n[2],B=n[6],q=n[10],H=n[14],te=n[3],Y=n[7],$=n[11],j=n[15];return r[0]=s*w+o*A+l*R+c*te,r[4]=s*I+o*E+l*B+c*Y,r[8]=s*_+o*F+l*q+c*$,r[12]=s*C+o*U+l*H+c*j,r[1]=u*w+f*A+d*R+h*te,r[5]=u*I+f*E+d*B+h*Y,r[9]=u*_+f*F+d*q+h*$,r[13]=u*C+f*U+d*H+h*j,r[2]=x*w+g*A+p*R+m*te,r[6]=x*I+g*E+p*B+m*Y,r[10]=x*_+g*F+p*q+m*$,r[14]=x*C+g*U+p*H+m*j,r[3]=y*w+L*A+v*R+S*te,r[7]=y*I+L*E+v*B+S*Y,r[11]=y*_+L*F+v*q+S*$,r[15]=y*C+L*U+v*H+S*j,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],a=e[4],n=e[8],r=e[12],s=e[1],o=e[5],l=e[9],c=e[13],u=e[2],f=e[6],d=e[10],h=e[14],x=e[3],g=e[7],p=e[11],m=e[15],y=l*h-c*d,L=o*h-c*f,v=o*d-l*f,S=s*h-c*u,w=s*d-l*u,I=s*f-o*u;return t*(g*y-p*L+m*v)-a*(x*y-p*S+m*w)+n*(x*L-g*S+m*I)-r*(x*v-g*w+p*I)}determinantAffine(){let e=this.elements,t=e[0],a=e[4],n=e[8],r=e[1],s=e[5],o=e[9],l=e[2],c=e[6],u=e[10];return t*(s*u-o*c)-a*(r*u-o*l)+n*(r*c-s*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,a){let n=this.elements;return e.isVector3?(n[12]=e.x,n[13]=e.y,n[14]=e.z):(n[12]=e,n[13]=t,n[14]=a),this}invert(){let e=this.elements,t=e[0],a=e[1],n=e[2],r=e[3],s=e[4],o=e[5],l=e[6],c=e[7],u=e[8],f=e[9],d=e[10],h=e[11],x=e[12],g=e[13],p=e[14],m=e[15],y=t*o-a*s,L=t*l-n*s,v=t*c-r*s,S=a*l-n*o,w=a*c-r*o,I=n*c-r*l,_=u*g-f*x,C=u*p-d*x,A=u*m-h*x,E=f*p-d*g,F=f*m-h*g,U=d*m-h*p,R=y*U-L*F+v*E+S*A-w*C+I*_;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let B=1/R;return e[0]=(o*U-l*F+c*E)*B,e[1]=(n*F-a*U-r*E)*B,e[2]=(g*I-p*w+m*S)*B,e[3]=(d*w-f*I-h*S)*B,e[4]=(l*A-s*U-c*C)*B,e[5]=(t*U-n*A+r*C)*B,e[6]=(p*v-x*I-m*L)*B,e[7]=(u*I-d*v+h*L)*B,e[8]=(s*F-o*A+c*_)*B,e[9]=(a*A-t*F-r*_)*B,e[10]=(x*w-g*v+m*y)*B,e[11]=(f*v-u*w-h*y)*B,e[12]=(o*C-s*E-l*_)*B,e[13]=(t*E-a*C+n*_)*B,e[14]=(g*L-x*S-p*y)*B,e[15]=(u*S-f*L+d*y)*B,this}scale(e){let t=this.elements,a=e.x,n=e.y,r=e.z;return t[0]*=a,t[4]*=n,t[8]*=r,t[1]*=a,t[5]*=n,t[9]*=r,t[2]*=a,t[6]*=n,t[10]*=r,t[3]*=a,t[7]*=n,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],a=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],n=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,a,n))}makeTranslation(e,t,a){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,a,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),a=Math.sin(e);return this.set(1,0,0,0,0,t,-a,0,0,a,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),a=Math.sin(e);return this.set(t,0,a,0,0,1,0,0,-a,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),a=Math.sin(e);return this.set(t,-a,0,0,a,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let a=Math.cos(t),n=Math.sin(t),r=1-a,s=e.x,o=e.y,l=e.z,c=r*s,u=r*o;return this.set(c*s+a,c*o-n*l,c*l+n*o,0,c*o+n*l,u*o+a,u*l-n*s,0,c*l-n*o,u*l+n*s,r*l*l+a,0,0,0,0,1),this}makeScale(e,t,a){return this.set(e,0,0,0,0,t,0,0,0,0,a,0,0,0,0,1),this}makeShear(e,t,a,n,r,s){return this.set(1,a,r,0,e,1,s,0,t,n,1,0,0,0,0,1),this}compose(e,t,a){let n=this.elements,r=t._x,s=t._y,o=t._z,l=t._w,c=r+r,u=s+s,f=o+o,d=r*c,h=r*u,x=r*f,g=s*u,p=s*f,m=o*f,y=l*c,L=l*u,v=l*f,S=a.x,w=a.y,I=a.z;return n[0]=(1-(g+m))*S,n[1]=(h+v)*S,n[2]=(x-L)*S,n[3]=0,n[4]=(h-v)*w,n[5]=(1-(d+m))*w,n[6]=(p+y)*w,n[7]=0,n[8]=(x+L)*I,n[9]=(p-y)*I,n[10]=(1-(d+g))*I,n[11]=0,n[12]=e.x,n[13]=e.y,n[14]=e.z,n[15]=1,this}decompose(e,t,a){let n=this.elements;e.x=n[12],e.y=n[13],e.z=n[14];let r=this.determinantAffine();if(r===0)return a.set(1,1,1),t.identity(),this;let s=ar.set(n[0],n[1],n[2]).length(),o=ar.set(n[4],n[5],n[6]).length(),l=ar.set(n[8],n[9],n[10]).length();r<0&&(s=-s),Ya.copy(this);let c=1/s,u=1/o,f=1/l;return Ya.elements[0]*=c,Ya.elements[1]*=c,Ya.elements[2]*=c,Ya.elements[4]*=u,Ya.elements[5]*=u,Ya.elements[6]*=u,Ya.elements[8]*=f,Ya.elements[9]*=f,Ya.elements[10]*=f,t.setFromRotationMatrix(Ya),a.x=s,a.y=o,a.z=l,this}makePerspective(e,t,a,n,r,s,o=$a,l=!1){let c=this.elements,u=2*r/(t-e),f=2*r/(a-n),d=(t+e)/(t-e),h=(a+n)/(a-n),x,g;if(l)x=r/(s-r),g=s*r/(s-r);else if(o===$a)x=-(s+r)/(s-r),g=-2*s*r/(s-r);else if(o===_r)x=-s/(s-r),g=-s*r/(s-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=f,c[9]=h,c[13]=0,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,a,n,r,s,o=$a,l=!1){let c=this.elements,u=2/(t-e),f=2/(a-n),d=-(t+e)/(t-e),h=-(a+n)/(a-n),x,g;if(l)x=1/(s-r),g=s/(s-r);else if(o===$a)x=-2/(s-r),g=-(s+r)/(s-r);else if(o===_r)x=-1/(s-r),g=-r/(s-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=f,c[9]=0,c[13]=h,c[2]=0,c[6]=0,c[10]=x,c[14]=g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,a=e.elements;for(let n=0;n<16;n++)if(t[n]!==a[n])return!1;return!0}fromArray(e,t=0){for(let a=0;a<16;a++)this.elements[a]=e[a+t];return this}toArray(e=[],t=0){let a=this.elements;return e[t]=a[0],e[t+1]=a[1],e[t+2]=a[2],e[t+3]=a[3],e[t+4]=a[4],e[t+5]=a[5],e[t+6]=a[6],e[t+7]=a[7],e[t+8]=a[8],e[t+9]=a[9],e[t+10]=a[10],e[t+11]=a[11],e[t+12]=a[12],e[t+13]=a[13],e[t+14]=a[14],e[t+15]=a[15],e}};ql.prototype.isMatrix4=!0;var xt=ql,ar=new O,Ya=new xt,qx=new O(0,0,0),Xx=new O(1,1,1),Jn=new O,Bo=new O,Ma=new O,ip=new xt,rp=new pn,mn=class i{constructor(e=0,t=0,a=0,n=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=a,this._order=n}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,a,n=this._order){return this._x=e,this._y=t,this._z=a,this._order=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,a=!0){let n=e.elements,r=n[0],s=n[4],o=n[8],l=n[1],c=n[5],u=n[9],f=n[2],d=n[6],h=n[10];switch(t){case"XYZ":this._y=Math.asin(je(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,h),this._z=Math.atan2(-s,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-je(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,h),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(je(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,h),this._z=Math.atan2(-s,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-je(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,h),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-s,c));break;case"YZX":this._z=Math.asin(je(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(o,h));break;case"XZY":this._z=Math.asin(-je(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-u,h),this._y=0);break;default:Oe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,a===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,a){return ip.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ip,t,a)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return rp.setFromEuler(this),this.setFromQuaternion(rp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};mn.DEFAULT_ORDER="XYZ";var Ss=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Yx=0,sp=new O,nr=new pn,An=new xt,Oo=new O,ss=new O,Zx=new O,Kx=new pn,op=new O(1,0,0),lp=new O(0,1,0),cp=new O(0,0,1),up={type:"added"},Jx={type:"removed"},ir={type:"childadded",child:null},Mu={type:"childremoved",child:null},Zt=class i extends hn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Yx++}),this.uuid=ki(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new O,t=new mn,a=new pn,n=new O(1,1,1);function r(){a.setFromEuler(t,!1)}function s(){t.setFromQuaternion(a,void 0,!1)}t._onChange(r),a._onChange(s),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:a},scale:{configurable:!0,enumerable:!0,value:n},modelViewMatrix:{value:new xt},normalMatrix:{value:new Ye}}),this.matrix=new xt,this.matrixWorld=new xt,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ss,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return nr.setFromAxisAngle(e,t),this.quaternion.multiply(nr),this}rotateOnWorldAxis(e,t){return nr.setFromAxisAngle(e,t),this.quaternion.premultiply(nr),this}rotateX(e){return this.rotateOnAxis(op,e)}rotateY(e){return this.rotateOnAxis(lp,e)}rotateZ(e){return this.rotateOnAxis(cp,e)}translateOnAxis(e,t){return sp.copy(e).applyQuaternion(this.quaternion),this.position.add(sp.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(op,e)}translateY(e){return this.translateOnAxis(lp,e)}translateZ(e){return this.translateOnAxis(cp,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(An.copy(this.matrixWorld).invert())}lookAt(e,t,a){e.isVector3?Oo.copy(e):Oo.set(e,t,a);let n=this.parent;this.updateWorldMatrix(!0,!1),ss.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?An.lookAt(ss,Oo,this.up):An.lookAt(Oo,ss,this.up),this.quaternion.setFromRotationMatrix(An),n&&(An.extractRotation(n.matrixWorld),nr.setFromRotationMatrix(An),this.quaternion.premultiply(nr.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(He("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(up),ir.child=e,this.dispatchEvent(ir),ir.child=null):He("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let a=0;a<arguments.length;a++)this.remove(arguments[a]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Jx),Mu.child=e,this.dispatchEvent(Mu),Mu.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),An.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),An.multiply(e.parent.matrixWorld)),e.applyMatrix4(An),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(up),ir.child=e,this.dispatchEvent(ir),ir.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let a=0,n=this.children.length;a<n;a++){let s=this.children[a].getObjectByProperty(e,t);if(s!==void 0)return s}}getObjectsByProperty(e,t,a=[]){this[e]===t&&a.push(this);let n=this.children;for(let r=0,s=n.length;r<s;r++)n[r].getObjectsByProperty(e,t,a);return a}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ss,e,Zx),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ss,Kx,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let a=0,n=t.length;a<n;a++)t[a].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let a=0,n=t.length;a<n;a++)t[a].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,a=e.y,n=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*a-r[8]*n,r[13]+=a-r[1]*t-r[5]*a-r[9]*n,r[14]+=n-r[2]*t-r[6]*a-r[10]*n}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let a=0,n=t.length;a<n;a++)t[a].updateMatrixWorld(e)}updateWorldMatrix(e,t,a=!1){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||a)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,a=!0),t===!0){let r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].updateWorldMatrix(!1,!0,a)}}toJSON(e){let t=e===void 0||typeof e=="string",a={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},a.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let n={};n.uuid=this.uuid,n.type=this.type,n.name=this.name,n.castShadow=this.castShadow,n.receiveShadow=this.receiveShadow,n.visible=this.visible,n.frustumCulled=this.frustumCulled,n.renderOrder=this.renderOrder,n.static=this.static,n.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(n.userData=this.userData),n.layers=this.layers.mask,n.matrix=this.matrix.toArray(),n.up=this.up.toArray(),this.pivot!==null&&(n.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(n.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(n.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(n.type="InstancedMesh",n.count=this.count,n.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(n.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(n.type="BatchedMesh",n.perObjectFrustumCulled=this.perObjectFrustumCulled,n.sortObjects=this.sortObjects,n.drawRanges=this._drawRanges,n.reservedRanges=this._reservedRanges,n.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),n.instanceInfo=this._instanceInfo.map(o=>({...o})),n.availableInstanceIds=this._availableInstanceIds.slice(),n.availableGeometryIds=this._availableGeometryIds.slice(),n.nextIndexStart=this._nextIndexStart,n.nextVertexStart=this._nextVertexStart,n.geometryCount=this._geometryCount,n.maxInstanceCount=this._maxInstanceCount,n.maxVertexCount=this._maxVertexCount,n.maxIndexCount=this._maxIndexCount,n.geometryInitialized=this._geometryInitialized,n.matricesTexture=this._matricesTexture.toJSON(e),n.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(n.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(n.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(n.boundingBox=this.boundingBox.toJSON()));function r(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?n.background=this.background.toJSON():this.background.isTexture&&(n.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(n.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){n.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(n.bindMode=this.bindMode,n.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),n.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(r(e.materials,this.material[l]));n.material=o}else n.material=r(e.materials,this.material);if(this.children.length>0){n.children=[];for(let o=0;o<this.children.length;o++)n.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){n.animations=[];for(let o=0;o<this.animations.length;o++){let l=this.animations[o];n.animations.push(r(e.animations,l))}}if(t){let o=s(e.geometries),l=s(e.materials),c=s(e.textures),u=s(e.images),f=s(e.shapes),d=s(e.skeletons),h=s(e.animations),x=s(e.nodes);o.length>0&&(a.geometries=o),l.length>0&&(a.materials=l),c.length>0&&(a.textures=c),u.length>0&&(a.images=u),f.length>0&&(a.shapes=f),d.length>0&&(a.skeletons=d),h.length>0&&(a.animations=h),x.length>0&&(a.nodes=x)}return a.object=n,a;function s(o){let l=[];for(let c in o){let u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let a=0;a<e.children.length;a++){let n=e.children[a];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}};Zt.DEFAULT_UP=new O(0,1,0);Zt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Zt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ua=class extends Zt{constructor(){super(),this.isGroup=!0,this.type="Group"}},$x={type:"move"},Sr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ua,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ua,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ua,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let a of e.hand.values())this._getHandJoint(t,a)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,a){let n=null,r=null,s=null,o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){s=!0;for(let g of e.hand.values()){let p=t.getJointPose(g,a),m=this._getHandJoint(c,g);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=u.position.distanceTo(f.position),h=.02,x=.005;c.inputState.pinching&&d>h+x?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=h-x&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,a),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(n=t.getPose(e.targetRaySpace,a),n===null&&r!==null&&(n=r),n!==null&&(o.matrix.fromArray(n.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,n.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(n.linearVelocity)):o.hasLinearVelocity=!1,n.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(n.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent($x)))}return o!==null&&(o.visible=n!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=s!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let a=new Ua;a.matrixAutoUpdate=!1,a.visible=!1,e.joints[t.jointName]=a,e.add(a)}return e.joints[t.jointName]}},mm={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},$n={h:0,s:0,l:0},zo={h:0,s:0,l:0};function Lu(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Xe=class{constructor(e,t,a){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,a)}set(e,t,a){if(t===void 0&&a===void 0){let n=e;n&&n.isColor?this.copy(n):typeof n=="number"?this.setHex(n):typeof n=="string"&&this.setStyle(n)}else this.setRGB(e,t,a);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Xt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,rt.colorSpaceToWorking(this,t),this}setRGB(e,t,a,n=rt.workingColorSpace){return this.r=e,this.g=t,this.b=a,rt.colorSpaceToWorking(this,n),this}setHSL(e,t,a,n=rt.workingColorSpace){if(e=wd(e,1),t=je(t,0,1),a=je(a,0,1),t===0)this.r=this.g=this.b=a;else{let r=a<=.5?a*(1+t):a+t-a*t,s=2*a-r;this.r=Lu(s,r,e+1/3),this.g=Lu(s,r,e),this.b=Lu(s,r,e-1/3)}return rt.colorSpaceToWorking(this,n),this}setStyle(e,t=Xt){function a(r){r!==void 0&&parseFloat(r)<1&&Oe("Color: Alpha component of "+e+" will be ignored.")}let n;if(n=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,s=n[1],o=n[2];switch(s){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return a(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return a(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return a(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Oe("Color: Unknown color model "+e)}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=n[1],s=r.length;if(s===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(s===6)return this.setHex(parseInt(r,16),t);Oe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Xt){let a=mm[e.toLowerCase()];return a!==void 0?this.setHex(a,t):Oe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Fn(e.r),this.g=Fn(e.g),this.b=Fn(e.b),this}copyLinearToSRGB(e){return this.r=gr(e.r),this.g=gr(e.g),this.b=gr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Xt){return rt.workingToColorSpace(ta.copy(this),e),Math.round(je(ta.r*255,0,255))*65536+Math.round(je(ta.g*255,0,255))*256+Math.round(je(ta.b*255,0,255))}getHexString(e=Xt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=rt.workingColorSpace){rt.workingToColorSpace(ta.copy(this),t);let a=ta.r,n=ta.g,r=ta.b,s=Math.max(a,n,r),o=Math.min(a,n,r),l,c,u=(o+s)/2;if(o===s)l=0,c=0;else{let f=s-o;switch(c=u<=.5?f/(s+o):f/(2-s-o),s){case a:l=(n-r)/f+(n<r?6:0);break;case n:l=(r-a)/f+2;break;case r:l=(a-n)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=rt.workingColorSpace){return rt.workingToColorSpace(ta.copy(this),t),e.r=ta.r,e.g=ta.g,e.b=ta.b,e}getStyle(e=Xt){rt.workingToColorSpace(ta.copy(this),e);let t=ta.r,a=ta.g,n=ta.b;return e!==Xt?`color(${e} ${t.toFixed(3)} ${a.toFixed(3)} ${n.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(a*255)},${Math.round(n*255)})`}offsetHSL(e,t,a){return this.getHSL($n),this.setHSL($n.h+e,$n.s+t,$n.l+a)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,a){return this.r=e.r+(t.r-e.r)*a,this.g=e.g+(t.g-e.g)*a,this.b=e.b+(t.b-e.b)*a,this}lerpHSL(e,t){this.getHSL($n),e.getHSL(zo);let a=ps($n.h,zo.h,t),n=ps($n.s,zo.s,t),r=ps($n.l,zo.l,t);return this.setHSL(a,n,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,a=this.g,n=this.b,r=e.elements;return this.r=r[0]*t+r[3]*a+r[6]*n,this.g=r[1]*t+r[4]*a+r[7]*n,this.b=r[2]*t+r[5]*a+r[8]*n,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},ta=new Xe;Xe.NAMES=mm;var ws=class i{constructor(e,t=1,a=1e3){this.isFog=!0,this.name="",this.color=new Xe(e),this.near=t,this.far=a}clone(){return new i(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},kn=class extends Zt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new mn,this.environmentIntensity=1,this.environmentRotation=new mn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Za=new O,En=new O,Cu=new O,Rn=new O,rr=new O,sr=new O,dp=new O,Iu=new O,Tu=new O,Au=new O,Eu=new Ct,Ru=new Ct,Pu=new Ct,ti=class i{constructor(e=new O,t=new O,a=new O){this.a=e,this.b=t,this.c=a}static getNormal(e,t,a,n){n.subVectors(a,t),Za.subVectors(e,t),n.cross(Za);let r=n.lengthSq();return r>0?n.multiplyScalar(1/Math.sqrt(r)):n.set(0,0,0)}static getBarycoord(e,t,a,n,r){Za.subVectors(n,t),En.subVectors(a,t),Cu.subVectors(e,t);let s=Za.dot(Za),o=Za.dot(En),l=Za.dot(Cu),c=En.dot(En),u=En.dot(Cu),f=s*c-o*o;if(f===0)return r.set(0,0,0),null;let d=1/f,h=(c*l-o*u)*d,x=(s*u-o*l)*d;return r.set(1-h-x,x,h)}static containsPoint(e,t,a,n){return this.getBarycoord(e,t,a,n,Rn)===null?!1:Rn.x>=0&&Rn.y>=0&&Rn.x+Rn.y<=1}static getInterpolation(e,t,a,n,r,s,o,l){return this.getBarycoord(e,t,a,n,Rn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Rn.x),l.addScaledVector(s,Rn.y),l.addScaledVector(o,Rn.z),l)}static getInterpolatedAttribute(e,t,a,n,r,s){return Eu.setScalar(0),Ru.setScalar(0),Pu.setScalar(0),Eu.fromBufferAttribute(e,t),Ru.fromBufferAttribute(e,a),Pu.fromBufferAttribute(e,n),s.setScalar(0),s.addScaledVector(Eu,r.x),s.addScaledVector(Ru,r.y),s.addScaledVector(Pu,r.z),s}static isFrontFacing(e,t,a,n){return Za.subVectors(a,t),En.subVectors(e,t),Za.cross(En).dot(n)<0}set(e,t,a){return this.a.copy(e),this.b.copy(t),this.c.copy(a),this}setFromPointsAndIndices(e,t,a,n){return this.a.copy(e[t]),this.b.copy(e[a]),this.c.copy(e[n]),this}setFromAttributeAndIndices(e,t,a,n){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,a),this.c.fromBufferAttribute(e,n),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Za.subVectors(this.c,this.b),En.subVectors(this.a,this.b),Za.cross(En).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,a,n,r){return i.getInterpolation(e,this.a,this.b,this.c,t,a,n,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let a=this.a,n=this.b,r=this.c,s,o;rr.subVectors(n,a),sr.subVectors(r,a),Iu.subVectors(e,a);let l=rr.dot(Iu),c=sr.dot(Iu);if(l<=0&&c<=0)return t.copy(a);Tu.subVectors(e,n);let u=rr.dot(Tu),f=sr.dot(Tu);if(u>=0&&f<=u)return t.copy(n);let d=l*f-u*c;if(d<=0&&l>=0&&u<=0)return s=l/(l-u),t.copy(a).addScaledVector(rr,s);Au.subVectors(e,r);let h=rr.dot(Au),x=sr.dot(Au);if(x>=0&&h<=x)return t.copy(r);let g=h*c-l*x;if(g<=0&&c>=0&&x<=0)return o=c/(c-x),t.copy(a).addScaledVector(sr,o);let p=u*x-h*f;if(p<=0&&f-u>=0&&h-x>=0)return dp.subVectors(r,n),o=(f-u)/(f-u+(h-x)),t.copy(n).addScaledVector(dp,o);let m=1/(p+g+d);return s=g*m,o=d*m,t.copy(a).addScaledVector(rr,s).addScaledVector(sr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},gn=class{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,a=e.length;t<a;t+=3)this.expandByPoint(Ka.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,a=e.count;t<a;t++)this.expandByPoint(Ka.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,a=e.length;t<a;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let a=Ka.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(a),this.max.copy(e).add(a),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let a=e.geometry;if(a!==void 0){let r=a.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let s=0,o=r.count;s<o;s++)e.isMesh===!0?e.getVertexPosition(s,Ka):Ka.fromBufferAttribute(r,s),Ka.applyMatrix4(e.matrixWorld),this.expandByPoint(Ka);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ho.copy(e.boundingBox)):(a.boundingBox===null&&a.computeBoundingBox(),Ho.copy(a.boundingBox)),Ho.applyMatrix4(e.matrixWorld),this.union(Ho)}let n=e.children;for(let r=0,s=n.length;r<s;r++)this.expandByObject(n[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Ka),Ka.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,a;return e.normal.x>0?(t=e.normal.x*this.min.x,a=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,a=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,a+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,a+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,a+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,a+=e.normal.z*this.min.z),t<=-e.constant&&a>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(os),Vo.subVectors(this.max,os),or.subVectors(e.a,os),lr.subVectors(e.b,os),cr.subVectors(e.c,os),Qn.subVectors(lr,or),jn.subVectors(cr,lr),Mi.subVectors(or,cr);let t=[0,-Qn.z,Qn.y,0,-jn.z,jn.y,0,-Mi.z,Mi.y,Qn.z,0,-Qn.x,jn.z,0,-jn.x,Mi.z,0,-Mi.x,-Qn.y,Qn.x,0,-jn.y,jn.x,0,-Mi.y,Mi.x,0];return!Du(t,or,lr,cr,Vo)||(t=[1,0,0,0,1,0,0,0,1],!Du(t,or,lr,cr,Vo))?!1:(Go.crossVectors(Qn,jn),t=[Go.x,Go.y,Go.z],Du(t,or,lr,cr,Vo))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Ka).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Ka).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Pn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Pn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Pn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Pn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Pn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Pn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Pn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Pn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Pn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Pn=[new O,new O,new O,new O,new O,new O,new O,new O],Ka=new O,Ho=new gn,or=new O,lr=new O,cr=new O,Qn=new O,jn=new O,Mi=new O,os=new O,Vo=new O,Go=new O,Li=new O;function Du(i,e,t,a,n){for(let r=0,s=i.length-3;r<=s;r+=3){Li.fromArray(i,r);let o=n.x*Math.abs(Li.x)+n.y*Math.abs(Li.y)+n.z*Math.abs(Li.z),l=e.dot(Li),c=t.dot(Li),u=a.dot(Li);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}var Nt=new O,Wo=new fe,Qx=0,fa=class extends hn{constructor(e,t,a=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Qx++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=a,this.usage=um,this.updateRanges=[],this.gpuType=Ba,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,a){e*=this.itemSize,a*=t.itemSize;for(let n=0,r=this.itemSize;n<r;n++)this.array[e+n]=t.array[a+n];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,a=this.count;t<a;t++)Wo.fromBufferAttribute(this,t),Wo.applyMatrix3(e),this.setXY(t,Wo.x,Wo.y);else if(this.itemSize===3)for(let t=0,a=this.count;t<a;t++)Nt.fromBufferAttribute(this,t),Nt.applyMatrix3(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}applyMatrix4(e){for(let t=0,a=this.count;t<a;t++)Nt.fromBufferAttribute(this,t),Nt.applyMatrix4(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}applyNormalMatrix(e){for(let t=0,a=this.count;t<a;t++)Nt.fromBufferAttribute(this,t),Nt.applyNormalMatrix(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}transformDirection(e){for(let t=0,a=this.count;t<a;t++)Nt.fromBufferAttribute(this,t),Nt.transformDirection(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let a=this.array[e*this.itemSize+t];return this.normalized&&(a=mr(a,this.array)),a}setComponent(e,t,a){return this.normalized&&(a=da(a,this.array)),this.array[e*this.itemSize+t]=a,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=mr(t,this.array)),t}setX(e,t){return this.normalized&&(t=da(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=mr(t,this.array)),t}setY(e,t){return this.normalized&&(t=da(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=mr(t,this.array)),t}setZ(e,t){return this.normalized&&(t=da(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=mr(t,this.array)),t}setW(e,t){return this.normalized&&(t=da(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,a){return e*=this.itemSize,this.normalized&&(t=da(t,this.array),a=da(a,this.array)),this.array[e+0]=t,this.array[e+1]=a,this}setXYZ(e,t,a,n){return e*=this.itemSize,this.normalized&&(t=da(t,this.array),a=da(a,this.array),n=da(n,this.array)),this.array[e+0]=t,this.array[e+1]=a,this.array[e+2]=n,this}setXYZW(e,t,a,n,r){return e*=this.itemSize,this.normalized&&(t=da(t,this.array),a=da(a,this.array),n=da(n,this.array),r=da(r,this.array)),this.array[e+0]=t,this.array[e+1]=a,this.array[e+2]=n,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}};var Ms=class extends fa{constructor(e,t,a){super(new Uint16Array(e),t,a)}};var Ls=class extends fa{constructor(e,t,a){super(new Uint32Array(e),t,a)}};var Bt=class extends fa{constructor(e,t,a){super(new Float32Array(e),t,a)}},jx=new gn,ls=new O,Fu=new O,Un=class{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let a=this.center;t!==void 0?a.copy(t):jx.setFromPoints(e).getCenter(a);let n=0;for(let r=0,s=e.length;r<s;r++)n=Math.max(n,a.distanceToSquared(e[r]));return this.radius=Math.sqrt(n),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let a=this.center.distanceToSquared(e);return t.copy(e),a>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;ls.subVectors(e,this.center);let t=ls.lengthSq();if(t>this.radius*this.radius){let a=Math.sqrt(t),n=(a-this.radius)*.5;this.center.addScaledVector(ls,n/a),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Fu.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(ls.copy(e.center).add(Fu)),this.expandByPoint(ls.copy(e.center).sub(Fu))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},e0=0,ka=new xt,ku=new Zt,ur=new O,La=new gn,cs=new gn,qt=new O,aa=class i extends hn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:e0++}),this.uuid=ki(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Mx(e)?Ls:Ms)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,a=0){this.groups.push({start:e,count:t,materialIndex:a})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let a=this.attributes.normal;if(a!==void 0){let r=new Ye().getNormalMatrix(e);a.applyNormalMatrix(r),a.needsUpdate=!0}let n=this.attributes.tangent;return n!==void 0&&(n.transformDirection(e),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return ka.makeRotationFromQuaternion(e),this.applyMatrix4(ka),this}rotateX(e){return ka.makeRotationX(e),this.applyMatrix4(ka),this}rotateY(e){return ka.makeRotationY(e),this.applyMatrix4(ka),this}rotateZ(e){return ka.makeRotationZ(e),this.applyMatrix4(ka),this}translate(e,t,a){return ka.makeTranslation(e,t,a),this.applyMatrix4(ka),this}scale(e,t,a){return ka.makeScale(e,t,a),this.applyMatrix4(ka),this}lookAt(e){return ku.lookAt(e),ku.updateMatrix(),this.applyMatrix4(ku.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ur).negate(),this.translate(ur.x,ur.y,ur.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let a=[];for(let n=0,r=e.length;n<r;n++){let s=e[n];a.push(s.x,s.y,s.z||0)}this.setAttribute("position",new Bt(a,3))}else{let a=Math.min(e.length,t.count);for(let n=0;n<a;n++){let r=e[n];t.setXYZ(n,r.x,r.y,r.z||0)}e.length>t.count&&Oe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new gn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){He("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let a=0,n=t.length;a<n;a++){let r=t[a];La.setFromBufferAttribute(r),this.morphTargetsRelative?(qt.addVectors(this.boundingBox.min,La.min),this.boundingBox.expandByPoint(qt),qt.addVectors(this.boundingBox.max,La.max),this.boundingBox.expandByPoint(qt)):(this.boundingBox.expandByPoint(La.min),this.boundingBox.expandByPoint(La.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&He('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Un);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){He("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){let a=this.boundingSphere.center;if(La.setFromBufferAttribute(e),t)for(let r=0,s=t.length;r<s;r++){let o=t[r];cs.setFromBufferAttribute(o),this.morphTargetsRelative?(qt.addVectors(La.min,cs.min),La.expandByPoint(qt),qt.addVectors(La.max,cs.max),La.expandByPoint(qt)):(La.expandByPoint(cs.min),La.expandByPoint(cs.max))}La.getCenter(a);let n=0;for(let r=0,s=e.count;r<s;r++)qt.fromBufferAttribute(e,r),n=Math.max(n,a.distanceToSquared(qt));if(t)for(let r=0,s=t.length;r<s;r++){let o=t[r],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)qt.fromBufferAttribute(o,c),l&&(ur.fromBufferAttribute(e,c),qt.add(ur)),n=Math.max(n,a.distanceToSquared(qt))}this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&He('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){He("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let a=t.position,n=t.normal,r=t.uv,s=this.getAttribute("tangent");(s===void 0||s.count!==a.count)&&(s=new fa(new Float32Array(4*a.count),4),this.setAttribute("tangent",s));let o=[],l=[];for(let _=0;_<a.count;_++)o[_]=new O,l[_]=new O;let c=new O,u=new O,f=new O,d=new fe,h=new fe,x=new fe,g=new O,p=new O;function m(_,C,A){c.fromBufferAttribute(a,_),u.fromBufferAttribute(a,C),f.fromBufferAttribute(a,A),d.fromBufferAttribute(r,_),h.fromBufferAttribute(r,C),x.fromBufferAttribute(r,A),u.sub(c),f.sub(c),h.sub(d),x.sub(d);let E=1/(h.x*x.y-x.x*h.y);isFinite(E)&&(g.copy(u).multiplyScalar(x.y).addScaledVector(f,-h.y).multiplyScalar(E),p.copy(f).multiplyScalar(h.x).addScaledVector(u,-x.x).multiplyScalar(E),o[_].add(g),o[C].add(g),o[A].add(g),l[_].add(p),l[C].add(p),l[A].add(p))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let _=0,C=y.length;_<C;++_){let A=y[_],E=A.start,F=A.count;for(let U=E,R=E+F;U<R;U+=3)m(e.getX(U+0),e.getX(U+1),e.getX(U+2))}let L=new O,v=new O,S=new O,w=new O;function I(_){S.fromBufferAttribute(n,_),w.copy(S);let C=o[_];L.copy(C),L.sub(S.multiplyScalar(S.dot(C))).normalize(),v.crossVectors(w,C);let E=v.dot(l[_])<0?-1:1;s.setXYZW(_,L.x,L.y,L.z,E)}for(let _=0,C=y.length;_<C;++_){let A=y[_],E=A.start,F=A.count;for(let U=E,R=E+F;U<R;U+=3)I(e.getX(U+0)),I(e.getX(U+1)),I(e.getX(U+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let a=this.getAttribute("normal");if(a===void 0||a.count!==t.count)a=new fa(new Float32Array(t.count*3),3),this.setAttribute("normal",a);else for(let d=0,h=a.count;d<h;d++)a.setXYZ(d,0,0,0);let n=new O,r=new O,s=new O,o=new O,l=new O,c=new O,u=new O,f=new O;if(e)for(let d=0,h=e.count;d<h;d+=3){let x=e.getX(d+0),g=e.getX(d+1),p=e.getX(d+2);n.fromBufferAttribute(t,x),r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,p),u.subVectors(s,r),f.subVectors(n,r),u.cross(f),o.fromBufferAttribute(a,x),l.fromBufferAttribute(a,g),c.fromBufferAttribute(a,p),o.add(u),l.add(u),c.add(u),a.setXYZ(x,o.x,o.y,o.z),a.setXYZ(g,l.x,l.y,l.z),a.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,h=t.count;d<h;d+=3)n.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),s.fromBufferAttribute(t,d+2),u.subVectors(s,r),f.subVectors(n,r),u.cross(f),a.setXYZ(d+0,u.x,u.y,u.z),a.setXYZ(d+1,u.x,u.y,u.z),a.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),a.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,a=e.count;t<a;t++)qt.fromBufferAttribute(e,t),qt.normalize(),e.setXYZ(t,qt.x,qt.y,qt.z)}toNonIndexed(){function e(o,l){let c=o.array,u=o.itemSize,f=o.normalized,d=new c.constructor(l.length*u),h=0,x=0;for(let g=0,p=l.length;g<p;g++){o.isInterleavedBufferAttribute?h=l[g]*o.data.stride+o.offset:h=l[g]*u;for(let m=0;m<u;m++)d[x++]=c[h++]}return new fa(d,u,f)}if(this.index===null)return Oe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,a=this.index.array,n=this.attributes;for(let o in n){let l=n[o],c=e(l,a);t.setAttribute(o,c)}let r=this.morphAttributes;for(let o in r){let l=[],c=r[o];for(let u=0,f=c.length;u<f;u++){let d=c[u],h=e(d,a);l.push(h)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;let s=this.groups;for(let o=0,l=s.length;o<l;o++){let c=s[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let a=this.attributes;for(let l in a){let c=a[l];e.data.attributes[l]=c.toJSON(e.data)}let n={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let f=0,d=c.length;f<d;f++){let h=c[f];u.push(h.toJSON(e.data))}u.length>0&&(n[l]=u,r=!0)}r&&(e.data.morphAttributes=n,e.data.morphTargetsRelative=this.morphTargetsRelative);let s=this.groups;s.length>0&&(e.data.groups=JSON.parse(JSON.stringify(s)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let a=e.index;a!==null&&this.setIndex(a.clone());let n=e.attributes;for(let c in n){let u=n[c];this.setAttribute(c,u.clone(t))}let r=e.morphAttributes;for(let c in r){let u=[],f=r[c];for(let d=0,h=f.length;d<h;d++)u.push(f[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let s=e.groups;for(let c=0,u=s.length;c<u;c++){let f=s[c];this.addGroup(f.start,f.count,f.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};var Uu=new O,t0=new O,a0=new Ye,Ja=class{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,a,n){return this.normal.set(e,t,a),this.constant=n,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,a){let n=Uu.subVectors(a,t).cross(t0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(n,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,a=!0){let n=e.delta(Uu),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let s=-(e.start.dot(this.normal)+this.constant)/r;return a===!0&&(s<0||s>1)?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){let t=this.distanceToPoint(e.start),a=this.distanceToPoint(e.end);return t<0&&a>0||a<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let a=t||a0.getNormalMatrix(e),n=this.coplanarPoint(Uu).applyMatrix4(e),r=this.normal.applyMatrix3(a).normalize();return this.constant=-n.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},n0=0,xn=class extends hn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:n0++}),this.uuid=ki(),this.name="",this.type="Material",this.blending=Rr,this.side=oi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=sd,this.blendDst=od,this.blendEquation=Di,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Xe(0,0,0),this.blendAlpha=0,this.depthFunc=xr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=nm,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=cl,this.stencilZFail=cl,this.stencilZPass=cl,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let a=e[t];if(a===void 0){Oe(`Material: parameter '${t}' has value of undefined.`);continue}let n=this[t];if(n===void 0){Oe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}n&&n.isColor?n.set(a):n&&n.isVector2&&a&&a.isVector2||n&&n.isEuler&&a&&a.isEuler||n&&n.isVector3&&a&&a.isVector3?n.copy(a):this[t]=a}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let a={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};a.uuid=this.uuid,a.type=this.type,a.blending=this.blending,a.side=this.side,a.shadowSide=this.shadowSide,a.vertexColors=this.vertexColors,a.opacity=this.opacity,a.transparent=this.transparent,a.blendSrc=this.blendSrc,a.blendDst=this.blendDst,a.blendEquation=this.blendEquation,a.blendSrcAlpha=this.blendSrcAlpha,a.blendDstAlpha=this.blendDstAlpha,a.blendEquationAlpha=this.blendEquationAlpha,a.blendColor=this.blendColor.getHex(),a.blendAlpha=this.blendAlpha,a.depthFunc=this.depthFunc,a.depthTest=this.depthTest,a.depthWrite=this.depthWrite,a.colorWrite=this.colorWrite,a.clipIntersection=this.clipIntersection,a.clipShadows=this.clipShadows,a.stencilWriteMask=this.stencilWriteMask,a.stencilFunc=this.stencilFunc,a.stencilRef=this.stencilRef,a.stencilFuncMask=this.stencilFuncMask,a.stencilFail=this.stencilFail,a.stencilZFail=this.stencilZFail,a.stencilZPass=this.stencilZPass,a.stencilWrite=this.stencilWrite,a.polygonOffset=this.polygonOffset,a.polygonOffsetFactor=this.polygonOffsetFactor,a.polygonOffsetUnits=this.polygonOffsetUnits,a.dithering=this.dithering,a.alphaTest=this.alphaTest,a.alphaHash=this.alphaHash,a.alphaToCoverage=this.alphaToCoverage,a.premultipliedAlpha=this.premultipliedAlpha,a.forceSinglePass=this.forceSinglePass,a.allowOverride=this.allowOverride,a.visible=this.visible,a.toneMapped=this.toneMapped,a.name=this.name,this.color&&this.color.isColor&&(a.color=this.color.getHex()),this.roughness!==void 0&&(a.roughness=this.roughness),this.metalness!==void 0&&(a.metalness=this.metalness),this.sheen!==void 0&&(a.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(a.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(a.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(a.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(a.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(a.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(a.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(a.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(a.shininess=this.shininess),this.clearcoat!==void 0&&(a.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(a.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(a.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(a.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(a.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,a.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(a.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(a.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(a.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(a.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(a.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(a.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(a.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(a.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(a.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(a.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(a.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(a.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(a.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(a.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(a.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(a.lightMap=this.lightMap.toJSON(e).uuid,a.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(a.aoMap=this.aoMap.toJSON(e).uuid,a.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(a.bumpMap=this.bumpMap.toJSON(e).uuid,a.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(a.normalMap=this.normalMap.toJSON(e).uuid,a.normalMapType=this.normalMapType,a.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(a.displacementMap=this.displacementMap.toJSON(e).uuid,a.displacementScale=this.displacementScale,a.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(a.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(a.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(a.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(a.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(a.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(a.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(a.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(a.combine=this.combine)),this.envMapRotation!==void 0&&(a.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(a.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(a.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(a.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(a.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(a.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(a.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(a.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(a.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(a.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(a.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(a.size=this.size),this.sizeAttenuation!==void 0&&(a.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(a.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(a.rotation=this.rotation),this.depthPacking!==void 0&&(a.depthPacking=this.depthPacking),this.linewidth!==void 0&&(a.linewidth=this.linewidth),this.linecap!==void 0&&(a.linecap=this.linecap),this.linejoin!==void 0&&(a.linejoin=this.linejoin),this.dashSize!==void 0&&(a.dashSize=this.dashSize),this.gapSize!==void 0&&(a.gapSize=this.gapSize),this.scale!==void 0&&(a.scale=this.scale),this.wireframe!==void 0&&(a.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(a.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(a.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(a.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(a.flatShading=this.flatShading),this.fog!==void 0&&(a.fog=this.fog),Object.keys(this.userData).length>0&&(a.userData=this.userData);function n(r){let s=[];for(let o in r){let l=r[o];delete l.metadata,s.push(l)}return s}if(t){let r=n(e.textures),s=n(e.images);r.length>0&&(a.textures=r),s.length>0&&(a.images=s)}return a}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Xe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(a=>new Ja().fromJSON(a))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let a=e.normalScale;Array.isArray(a)===!1&&(a=[a,a]),this.normalScale=new fe().fromArray(a)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new fe().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,a=null;if(t!==null){let n=t.length;a=new Array(n);for(let r=0;r!==n;++r)a[r]=t[r].clone()}return this.clippingPlanes=a,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var Dn=new O,Nu=new O,qo=new O,Xo=new O,Cs=class{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Dn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let a=t.dot(this.direction);return a<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,a)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Dn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Dn.copy(this.origin).addScaledVector(this.direction,t),Dn.distanceToSquared(e))}distanceSqToSegment(e,t,a,n){Nu.copy(e).add(t).multiplyScalar(.5),qo.copy(t).sub(e).normalize(),Xo.copy(this.origin).sub(Nu);let r=e.distanceTo(t)*.5,s=-this.direction.dot(qo),o=Xo.dot(this.direction),l=-Xo.dot(qo),c=Xo.lengthSq(),u=Math.abs(1-s*s),f,d,h,x;if(u>0)if(f=s*l-o,d=s*o-l,x=r*u,f>=0)if(d>=-x)if(d<=x){let g=1/u;f*=g,d*=g,h=f*(f+s*d+2*o)+d*(s*f+d+2*l)+c}else d=r,f=Math.max(0,-(s*d+o)),h=-f*f+d*(d+2*l)+c;else d=-r,f=Math.max(0,-(s*d+o)),h=-f*f+d*(d+2*l)+c;else d<=-x?(f=Math.max(0,-(-s*r+o)),d=f>0?-r:Math.min(Math.max(-r,-l),r),h=-f*f+d*(d+2*l)+c):d<=x?(f=0,d=Math.min(Math.max(-r,-l),r),h=d*(d+2*l)+c):(f=Math.max(0,-(s*r+o)),d=f>0?r:Math.min(Math.max(-r,-l),r),h=-f*f+d*(d+2*l)+c);else d=s>0?-r:r,f=Math.max(0,-(s*d+o)),h=-f*f+d*(d+2*l)+c;return a&&a.copy(this.origin).addScaledVector(this.direction,f),n&&n.copy(Nu).addScaledVector(qo,d),h}intersectSphere(e,t){if(e.radius<0)return null;Dn.subVectors(e.center,this.origin);let a=Dn.dot(this.direction),n=Dn.dot(Dn)-a*a,r=e.radius*e.radius;if(n>r)return null;let s=Math.sqrt(r-n),o=a-s,l=a+s;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let a=-(this.origin.dot(e.normal)+e.constant)/t;return a>=0?a:null}intersectPlane(e,t){let a=this.distanceToPlane(e);return a===null?null:this.at(a,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let a,n,r,s,o,l,c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(a=(e.min.x-d.x)*c,n=(e.max.x-d.x)*c):(a=(e.max.x-d.x)*c,n=(e.min.x-d.x)*c),u>=0?(r=(e.min.y-d.y)*u,s=(e.max.y-d.y)*u):(r=(e.max.y-d.y)*u,s=(e.min.y-d.y)*u),a>s||r>n||((r>a||isNaN(a))&&(a=r),(s<n||isNaN(n))&&(n=s),f>=0?(o=(e.min.z-d.z)*f,l=(e.max.z-d.z)*f):(o=(e.max.z-d.z)*f,l=(e.min.z-d.z)*f),a>l||o>n)||((o>a||a!==a)&&(a=o),(l<n||n!==n)&&(n=l),n<0)?null:this.at(a>=0?a:n,t)}intersectsBox(e){return this.intersectBox(e,Dn)!==null}intersectTriangle(e,t,a,n,r){let s=this.origin,o=this.direction,l=o.x,c=o.y,u=o.z,f=e.x-s.x,d=e.y-s.y,h=e.z-s.z,x=t.x-s.x,g=t.y-s.y,p=t.z-s.z,m=a.x-s.x,y=a.y-s.y,L=a.z-s.z,v=Math.abs(l),S=Math.abs(c),w=Math.abs(u),I,_,C,A,E,F,U,R,B,q,H,te;if(v>=S&&v>=w?(C=l,F=f,B=x,te=m,l>=0?(I=c,_=u,A=d,E=h,U=g,R=p,q=y,H=L):(I=u,_=c,A=h,E=d,U=p,R=g,q=L,H=y)):S>=w?(C=c,F=d,B=g,te=y,c>=0?(I=u,_=l,A=h,E=f,U=p,R=x,q=L,H=m):(I=l,_=u,A=f,E=h,U=x,R=p,q=m,H=L)):(C=u,F=h,B=p,te=L,u>=0?(I=l,_=c,A=f,E=d,U=x,R=g,q=m,H=y):(I=c,_=l,A=d,E=f,U=g,R=x,q=y,H=m)),C===0)return null;let Y=I/C,$=_/C,j=1/C,Ce=A-Y*F,Me=E-$*F,Je=U-Y*B,qe=R-$*B,ot=q-Y*te,J=H-$*te,ae=ot*qe-J*Je,ve=Ce*J-Me*ot,ze=Je*Me-qe*Ce;if(n){if(ae<0||ve<0||ze<0)return null}else if((ae<0||ve<0||ze<0)&&(ae>0||ve>0||ze>0))return null;let we=ae+ve+ze;if(we===0)return null;let Ve=j*(ae*F+ve*B+ze*te);return(we>0?Ve<0:Ve>0)?null:this.at(Ve/we,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},na=class extends xn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Xl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},fp=new xt,Ci=new Cs,Yo=new Un,hp=new O,Zo=new O,Ko=new O,Jo=new O,Bu=new O,$o=new O,pp=new O,Qo=new O,nt=class extends Zt{constructor(e=new aa,t=new na){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,a=Object.keys(t);if(a.length>0){let n=t[a[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,s=n.length;r<s;r++){let o=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let a=this.geometry,n=a.attributes.position,r=a.morphAttributes.position,s=a.morphTargetsRelative;t.fromBufferAttribute(n,e);let o=this.morphTargetInfluences;if(r&&o){$o.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let u=o[l],f=r[l];u!==0&&(Bu.fromBufferAttribute(f,e),s?$o.addScaledVector(Bu,u):$o.addScaledVector(Bu.sub(t),u))}t.add($o)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let a=this.geometry,n=this.material,r=this.matrixWorld;n!==void 0&&(a.boundingSphere===null&&a.computeBoundingSphere(),Yo.copy(a.boundingSphere),Yo.applyMatrix4(r),Ci.copy(e.ray).recast(e.near),!(Yo.containsPoint(Ci.origin)===!1&&(Ci.intersectSphere(Yo,hp)===null||Ci.origin.distanceToSquared(hp)>(e.far-e.near)**2))&&(fp.copy(r).invert(),Ci.copy(e.ray).applyMatrix4(fp),!(a.boundingBox!==null&&Ci.intersectsBox(a.boundingBox)===!1)&&this._computeIntersections(e,t,Ci)))}_computeIntersections(e,t,a){let n,r=this.geometry,s=this.material,o=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,f=r.attributes.normal,d=r.groups,h=r.drawRange;if(o!==null)if(Array.isArray(s))for(let x=0,g=d.length;x<g;x++){let p=d[x],m=s[p.materialIndex],y=Math.max(p.start,h.start),L=Math.min(o.count,Math.min(p.start+p.count,h.start+h.count));for(let v=y,S=L;v<S;v+=3){let w=o.getX(v),I=o.getX(v+1),_=o.getX(v+2);n=jo(this,m,e,a,c,u,f,w,I,_),n&&(n.faceIndex=Math.floor(v/3),n.face.materialIndex=p.materialIndex,t.push(n))}}else{let x=Math.max(0,h.start),g=Math.min(o.count,h.start+h.count);for(let p=x,m=g;p<m;p+=3){let y=o.getX(p),L=o.getX(p+1),v=o.getX(p+2);n=jo(this,s,e,a,c,u,f,y,L,v),n&&(n.faceIndex=Math.floor(p/3),t.push(n))}}else if(l!==void 0)if(Array.isArray(s))for(let x=0,g=d.length;x<g;x++){let p=d[x],m=s[p.materialIndex],y=Math.max(p.start,h.start),L=Math.min(l.count,Math.min(p.start+p.count,h.start+h.count));for(let v=y,S=L;v<S;v+=3){let w=v,I=v+1,_=v+2;n=jo(this,m,e,a,c,u,f,w,I,_),n&&(n.faceIndex=Math.floor(v/3),n.face.materialIndex=p.materialIndex,t.push(n))}}else{let x=Math.max(0,h.start),g=Math.min(l.count,h.start+h.count);for(let p=x,m=g;p<m;p+=3){let y=p,L=p+1,v=p+2;n=jo(this,s,e,a,c,u,f,y,L,v),n&&(n.faceIndex=Math.floor(p/3),t.push(n))}}}};function i0(i,e,t,a,n,r,s,o){let l;if(e.side===Kt?l=a.intersectTriangle(s,r,n,!0,o):l=a.intersectTriangle(n,r,s,e.side===oi,o),l===null)return null;Qo.copy(o),Qo.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Qo);return c<t.near||c>t.far?null:{distance:c,point:Qo.clone(),object:i}}function jo(i,e,t,a,n,r,s,o,l,c){i.getVertexPosition(o,Zo),i.getVertexPosition(l,Ko),i.getVertexPosition(c,Jo);let u=i0(i,e,t,a,Zo,Ko,Jo,pp);if(u){let f=new O;ti.getBarycoord(pp,Zo,Ko,Jo,f),n&&(u.uv=ti.getInterpolatedAttribute(n,o,l,c,f,new fe)),r&&(u.uv1=ti.getInterpolatedAttribute(r,o,l,c,f,new fe)),s&&(u.normal=ti.getInterpolatedAttribute(s,o,l,c,f,new O),u.normal.dot(a.direction)>0&&u.normal.multiplyScalar(-1));let d={a:o,b:l,c,normal:new O,materialIndex:0};ti.getNormal(Zo,Ko,Jo,d.normal),u.face=d,u.barycoord=f}return u}var Is=class extends ha{constructor(e=null,t=1,a=1,n,r,s,o,l,c=Yt,u=Yt,f,d){super(null,s,o,l,c,u,n,r,f,d),this.isDataTexture=!0,this.image={data:e,width:t,height:a},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ts=class extends fa{constructor(e,t,a,n=1){super(e,t,a),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=n}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},dr=new xt,mp=new xt,el=[],gp=new gn,r0=new xt,us=new nt,ds=new Un,As=class extends nt{constructor(e,t,a){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ts(new Float32Array(a*16),16),this.instanceColor=null,this.morphTexture=null,this.count=a,this.boundingBox=null,this.boundingSphere=null;for(let n=0;n<a;n++)this.setMatrixAt(n,r0)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new gn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let a=0;a<t;a++)this.getMatrixAt(a,dr),gp.copy(e.boundingBox).applyMatrix4(dr),this.boundingBox.union(gp)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Un),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let a=0;a<t;a++)this.getMatrixAt(a,dr),ds.copy(e.boundingSphere).applyMatrix4(dr),this.boundingSphere.union(ds)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let a=t.morphTargetInfluences,n=this.morphTexture.source.data.data,r=a.length+1,s=e*r+1;for(let o=0;o<a.length;o++)a[o]=n[s+o]}raycast(e,t){let a=this.matrixWorld,n=this.count;if(us.geometry=this.geometry,us.material=this.material,us.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ds.copy(this.boundingSphere),ds.applyMatrix4(a),e.ray.intersectsSphere(ds)!==!1))for(let r=0;r<n;r++){this.getMatrixAt(r,dr),mp.multiplyMatrices(a,dr),us.matrixWorld=mp,us.raycast(e,el);for(let s=0,o=el.length;s<o;s++){let l=el[s];l.instanceId=r,l.object=this,t.push(l)}el.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new Ts(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let a=t.morphTargetInfluences,n=a.length+1;this.morphTexture===null&&(this.morphTexture=new Is(new Float32Array(n*this.count),n,this.count,jl,Ba));let r=this.morphTexture.source.data.data,s=0;for(let c=0;c<a.length;c++)s+=a[c];let o=this.geometry.morphTargetsRelative?1:1-s,l=n*e;return r[l]=o,r.set(a,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},Ii=new Un,s0=new fe(.5,.5),tl=new O,wr=class{constructor(e=new Ja,t=new Ja,a=new Ja,n=new Ja,r=new Ja,s=new Ja){this.planes=[e,t,a,n,r,s]}set(e,t,a,n,r,s){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(a),o[3].copy(n),o[4].copy(r),o[5].copy(s),this}copy(e){let t=this.planes;for(let a=0;a<6;a++)t[a].copy(e.planes[a]);return this}setFromProjectionMatrix(e,t=$a,a=!1){let n=this.planes,r=e.elements,s=r[0],o=r[1],l=r[2],c=r[3],u=r[4],f=r[5],d=r[6],h=r[7],x=r[8],g=r[9],p=r[10],m=r[11],y=r[12],L=r[13],v=r[14],S=r[15];if(n[0].setComponents(c-s,h-u,m-x,S-y).normalize(),n[1].setComponents(c+s,h+u,m+x,S+y).normalize(),n[2].setComponents(c+o,h+f,m+g,S+L).normalize(),n[3].setComponents(c-o,h-f,m-g,S-L).normalize(),a)n[4].setComponents(l,d,p,v).normalize(),n[5].setComponents(c-l,h-d,m-p,S-v).normalize();else if(n[4].setComponents(c-l,h-d,m-p,S-v).normalize(),t===$a)n[5].setComponents(c+l,h+d,m+p,S+v).normalize();else if(t===_r)n[5].setComponents(l,d,p,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ii.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ii.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ii)}intersectsSprite(e){Ii.center.set(0,0,0);let t=s0.distanceTo(e.center);return Ii.radius=.7071067811865476+t,Ii.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ii)}intersectsSphere(e){let t=this.planes,a=e.center,n=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(a)<n)return!1;return!0}intersectsBox(e){let t=this.planes;for(let a=0;a<6;a++){let n=t[a];if(tl.x=n.normal.x>0?e.max.x:e.min.x,tl.y=n.normal.y>0?e.max.y:e.min.y,tl.z=n.normal.z>0?e.max.z:e.min.z,n.distanceToPoint(tl)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let a=0;a<6;a++)if(t[a].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Mr=class extends xn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Xe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},xp=new xt,Zu=new Cs,al=new Un,nl=new O,Es=class extends Zt{constructor(e=new aa,t=new Mr){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let a=this.geometry,n=this.matrixWorld,r=e.params.Points.threshold,s=a.drawRange;if(a.boundingSphere===null&&a.computeBoundingSphere(),al.copy(a.boundingSphere),al.applyMatrix4(n),al.radius+=r,e.ray.intersectsSphere(al)===!1)return;xp.copy(n).invert(),Zu.copy(e.ray).applyMatrix4(xp);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=a.index,f=a.attributes.position;if(c!==null){let d=Math.max(0,s.start),h=Math.min(c.count,s.start+s.count);for(let x=d,g=h;x<g;x++){let p=c.getX(x);nl.fromBufferAttribute(f,p),_p(nl,p,l,n,e,t,this)}}else{let d=Math.max(0,s.start),h=Math.min(f.count,s.start+s.count);for(let x=d,g=h;x<g;x++)nl.fromBufferAttribute(f,x),_p(nl,x,l,n,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,a=Object.keys(t);if(a.length>0){let n=t[a[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,s=n.length;r<s;r++){let o=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function _p(i,e,t,a,n,r,s){let o=Zu.distanceSqToPoint(i);if(o<t){let l=new O;Zu.closestPointToPoint(i,l),l.applyMatrix4(a);let c=n.ray.origin.distanceTo(l);if(c<n.near||c>n.far)return;r.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:s})}}var Rs=class extends ha{constructor(e=[],t=li,a,n,r,s,o,l,c,u){super(e,t,a,n,r,s,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Nn=class extends ha{constructor(e,t,a,n,r,s,o,l,c){super(e,t,a,n,r,s,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var ai=class extends ha{constructor(e,t,a=ja,n,r,s,o=Yt,l=Yt,c,u=fn,f=1){if(u!==fn&&u!==ci)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:e,height:t,depth:f};super(d,n,r,s,o,l,u,a,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new yr(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},wl=class extends ai{constructor(e,t=ja,a=li,n,r,s=Yt,o=Yt,l,c=fn){let u={width:e,height:e,depth:1},f=[u,u,u,u,u,u];super(e,e,t,a,n,r,s,o,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Ps=class extends ha{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},_n=class i extends aa{constructor(e=1,t=1,a=1,n=1,r=1,s=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:a,widthSegments:n,heightSegments:r,depthSegments:s};let o=this;n=Math.floor(n),r=Math.floor(r),s=Math.floor(s);let l=[],c=[],u=[],f=[],d=0,h=0;x("z","y","x",-1,-1,a,t,e,s,r,0),x("z","y","x",1,-1,a,t,-e,s,r,1),x("x","z","y",1,1,e,a,t,n,s,2),x("x","z","y",1,-1,e,a,-t,n,s,3),x("x","y","z",1,-1,e,t,a,n,r,4),x("x","y","z",-1,-1,e,t,-a,n,r,5),this.setIndex(l),this.setAttribute("position",new Bt(c,3)),this.setAttribute("normal",new Bt(u,3)),this.setAttribute("uv",new Bt(f,2));function x(g,p,m,y,L,v,S,w,I,_,C){let A=v/I,E=S/_,F=v/2,U=S/2,R=w/2,B=I+1,q=_+1,H=0,te=0,Y=new O;for(let $=0;$<q;$++){let j=$*E-U;for(let Ce=0;Ce<B;Ce++){let Me=Ce*A-F;Y[g]=Me*y,Y[p]=j*L,Y[m]=R,c.push(Y.x,Y.y,Y.z),Y[g]=0,Y[p]=0,Y[m]=w>0?1:-1,u.push(Y.x,Y.y,Y.z),f.push(Ce/I),f.push(1-$/_),H+=1}}for(let $=0;$<_;$++)for(let j=0;j<I;j++){let Ce=d+j+B*$,Me=d+j+B*($+1),Je=d+(j+1)+B*($+1),qe=d+(j+1)+B*$;l.push(Ce,Me,qe),l.push(Me,Je,qe),te+=6}o.addGroup(h,te,C),h+=te,d+=H}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var Ca=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Oe("Curve: .getPoint() not implemented.")}getPointAt(e,t){let a=this.getUtoTmapping(e);return this.getPoint(a,t)}getPoints(e=5){let t=[];for(let a=0;a<=e;a++)t.push(this.getPoint(a/e));return t}getSpacedPoints(e=5){let t=[];for(let a=0;a<=e;a++)t.push(this.getPointAt(a/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],a,n=this.getPoint(0),r=0;t.push(0);for(let s=1;s<=e;s++)a=this.getPoint(s/e),r+=a.distanceTo(n),t.push(r),n=a;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let a=this.getLengths(),n=0,r=a.length,s;t?s=t:s=e*a[r-1];let o=0,l=r-1,c;for(;o<=l;)if(n=Math.floor(o+(l-o)/2),c=a[n]-s,c<0)o=n+1;else if(c>0)l=n-1;else{l=n;break}if(n=l,a[n]===s)return n/(r-1);let u=a[n],d=a[n+1]-u,h=(s-u)/d;return(n+h)/(r-1)}getTangent(e,t){let n=e-1e-4,r=e+1e-4;n<0&&(n=0),r>1&&(r=1);let s=this.getPoint(n),o=this.getPoint(r),l=t||(s.isVector2?new fe:new O);return l.copy(o).sub(s).normalize(),l}getTangentAt(e,t){let a=this.getUtoTmapping(e);return this.getTangent(a,t)}computeFrenetFrames(e,t=!1){let a=new O,n=[],r=[],s=[],o=new O,l=new xt;for(let h=0;h<=e;h++){let x=h/e;n[h]=this.getTangentAt(x,new O)}r[0]=new O,s[0]=new O;let c=Number.MAX_VALUE,u=Math.abs(n[0].x),f=Math.abs(n[0].y),d=Math.abs(n[0].z);u<=c&&(c=u,a.set(1,0,0)),f<=c&&(c=f,a.set(0,1,0)),d<=c&&a.set(0,0,1),o.crossVectors(n[0],a).normalize(),r[0].crossVectors(n[0],o),s[0].crossVectors(n[0],r[0]);for(let h=1;h<=e;h++){if(r[h]=r[h-1].clone(),s[h]=s[h-1].clone(),o.crossVectors(n[h-1],n[h]),o.length()>Number.EPSILON){o.normalize();let x=Math.acos(je(n[h-1].dot(n[h]),-1,1));r[h].applyMatrix4(l.makeRotationAxis(o,x))}s[h].crossVectors(n[h],r[h])}if(t===!0){let h=Math.acos(je(r[0].dot(r[e]),-1,1));h/=e,n[0].dot(o.crossVectors(r[0],r[e]))>0&&(h=-h);for(let x=1;x<=e;x++)r[x].applyMatrix4(l.makeRotationAxis(n[x],h*x)),s[x].crossVectors(n[x],r[x])}return{tangents:n,normals:r,binormals:s}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Lr=class extends Ca{constructor(e=0,t=0,a=1,n=1,r=0,s=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=a,this.yRadius=n,this.aStartAngle=r,this.aEndAngle=s,this.aClockwise=o,this.aRotation=l}getPoint(e,t=new fe){let a=t,n=Math.PI*2,r=this.aEndAngle-this.aStartAngle,s=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=n;for(;r>n;)r-=n;r<Number.EPSILON&&(s?r=0:r=n),this.aClockwise===!0&&!s&&(r===n?r=-n:r=r-n);let o=this.aStartAngle+e*r,l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let u=Math.cos(this.aRotation),f=Math.sin(this.aRotation),d=l-this.aX,h=c-this.aY;l=d*u-h*f+this.aX,c=d*f+h*u+this.aY}return a.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Ml=class extends Lr{constructor(e,t,a,n,r,s){super(e,t,a,a,n,r,s),this.isArcCurve=!0,this.type="ArcCurve"}};function Md(){let i=0,e=0,t=0,a=0;function n(r,s,o,l){i=r,e=o,t=-3*r+3*s-2*o-l,a=2*r-2*s+o+l}return{initCatmullRom:function(r,s,o,l,c){n(s,o,c*(o-r),c*(l-s))},initNonuniformCatmullRom:function(r,s,o,l,c,u,f){let d=(s-r)/c-(o-r)/(c+u)+(o-s)/u,h=(o-s)/u-(l-s)/(u+f)+(l-o)/f;d*=u,h*=u,n(s,o,d,h)},calc:function(r){let s=r*r,o=s*r;return i+e*r+t*s+a*o}}}var vp=new O,bp=new O,Ou=new Md,zu=new Md,Hu=new Md,Ll=class extends Ca{constructor(e=[],t=!1,a="centripetal",n=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=a,this.tension=n}getPoint(e,t=new O){let a=t,n=this.points,r=n.length,s=(r-(this.closed?0:1))*e,o=Math.floor(s),l=s-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:l===0&&o===r-1&&(o=r-2,l=1);let c,u;this.closed||o>0?c=n[(o-1)%r]:(bp.subVectors(n[0],n[1]).add(n[0]),c=bp);let f=n[o%r],d=n[(o+1)%r];if(this.closed||o+2<r?u=n[(o+2)%r]:(vp.subVectors(n[r-1],n[r-2]).add(n[r-1]),u=vp),this.curveType==="centripetal"||this.curveType==="chordal"){let h=this.curveType==="chordal"?.5:.25,x=Math.pow(c.distanceToSquared(f),h),g=Math.pow(f.distanceToSquared(d),h),p=Math.pow(d.distanceToSquared(u),h);g<1e-4&&(g=1),x<1e-4&&(x=g),p<1e-4&&(p=g),Ou.initNonuniformCatmullRom(c.x,f.x,d.x,u.x,x,g,p),zu.initNonuniformCatmullRom(c.y,f.y,d.y,u.y,x,g,p),Hu.initNonuniformCatmullRom(c.z,f.z,d.z,u.z,x,g,p)}else this.curveType==="catmullrom"&&(Ou.initCatmullRom(c.x,f.x,d.x,u.x,this.tension),zu.initCatmullRom(c.y,f.y,d.y,u.y,this.tension),Hu.initCatmullRom(c.z,f.z,d.z,u.z,this.tension));return a.set(Ou.calc(l),zu.calc(l),Hu.calc(l)),a}copy(e){super.copy(e),this.points=[];for(let t=0,a=e.points.length;t<a;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,a=this.points.length;t<a;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,a=e.points.length;t<a;t++){let n=e.points[t];this.points.push(new O().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function yp(i,e,t,a,n){let r=(a-e)*.5,s=(n-t)*.5,o=i*i,l=i*o;return(2*t-2*a+r+s)*l+(-3*t+3*a-2*r-s)*o+r*i+t}function o0(i,e){let t=1-i;return t*t*e}function l0(i,e){return 2*(1-i)*i*e}function c0(i,e){return i*i*e}function ms(i,e,t,a){return o0(i,e)+l0(i,t)+c0(i,a)}function u0(i,e){let t=1-i;return t*t*t*e}function d0(i,e){let t=1-i;return 3*t*t*i*e}function f0(i,e){return 3*(1-i)*i*i*e}function h0(i,e){return i*i*i*e}function gs(i,e,t,a,n){return u0(i,e)+d0(i,t)+f0(i,a)+h0(i,n)}var Ds=class extends Ca{constructor(e=new fe,t=new fe,a=new fe,n=new fe){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=a,this.v3=n}getPoint(e,t=new fe){let a=t,n=this.v0,r=this.v1,s=this.v2,o=this.v3;return a.set(gs(e,n.x,r.x,s.x,o.x),gs(e,n.y,r.y,s.y,o.y)),a}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Cl=class extends Ca{constructor(e=new O,t=new O,a=new O,n=new O){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=a,this.v3=n}getPoint(e,t=new O){let a=t,n=this.v0,r=this.v1,s=this.v2,o=this.v3;return a.set(gs(e,n.x,r.x,s.x,o.x),gs(e,n.y,r.y,s.y,o.y),gs(e,n.z,r.z,s.z,o.z)),a}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Fs=class extends Ca{constructor(e=new fe,t=new fe){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new fe){let a=t;return e===1?a.copy(this.v2):(a.copy(this.v2).sub(this.v1),a.multiplyScalar(e).add(this.v1)),a}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new fe){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Il=class extends Ca{constructor(e=new O,t=new O){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new O){let a=t;return e===1?a.copy(this.v2):(a.copy(this.v2).sub(this.v1),a.multiplyScalar(e).add(this.v1)),a}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new O){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ks=class extends Ca{constructor(e=new fe,t=new fe,a=new fe){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=a}getPoint(e,t=new fe){let a=t,n=this.v0,r=this.v1,s=this.v2;return a.set(ms(e,n.x,r.x,s.x),ms(e,n.y,r.y,s.y)),a}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Tl=class extends Ca{constructor(e=new O,t=new O,a=new O){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=a}getPoint(e,t=new O){let a=t,n=this.v0,r=this.v1,s=this.v2;return a.set(ms(e,n.x,r.x,s.x),ms(e,n.y,r.y,s.y),ms(e,n.z,r.z,s.z)),a}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Us=class extends Ca{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new fe){let a=t,n=this.points,r=(n.length-1)*e,s=Math.floor(r),o=r-s,l=n[s===0?s:s-1],c=n[s],u=n[s>n.length-2?n.length-1:s+1],f=n[s>n.length-3?n.length-1:s+2];return a.set(yp(o,l.x,c.x,u.x,f.x),yp(o,l.y,c.y,u.y,f.y)),a}copy(e){super.copy(e),this.points=[];for(let t=0,a=e.points.length;t<a;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,a=this.points.length;t<a;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,a=e.points.length;t<a;t++){let n=e.points[t];this.points.push(new fe().fromArray(n))}return this}},Ku=Object.freeze({__proto__:null,ArcCurve:Ml,CatmullRomCurve3:Ll,CubicBezierCurve:Ds,CubicBezierCurve3:Cl,EllipseCurve:Lr,LineCurve:Fs,LineCurve3:Il,QuadraticBezierCurve:ks,QuadraticBezierCurve3:Tl,SplineCurve:Us}),Al=class extends Ca{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let a=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Ku[a](t,e))}return this}getPoint(e,t){let a=e*this.getLength(),n=this.getCurveLengths(),r=0;for(;r<n.length;){if(n[r]>=a){let s=n[r]-a,o=this.curves[r],l=o.getLength(),c=l===0?0:1-s/l;return o.getPointAt(c,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let a=0,n=this.curves.length;a<n;a++)t+=this.curves[a].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let a=0;a<=e;a++)t.push(this.getPoint(a/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],a;for(let n=0,r=this.curves;n<r.length;n++){let s=r[n],o=s.isEllipseCurve?e*2:s.isLineCurve||s.isLineCurve3?1:s.isSplineCurve?e*s.points.length:e,l=s.getPoints(o);for(let c=0;c<l.length;c++){let u=l[c];a&&a.equals(u)||(t.push(u),a=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,a=e.curves.length;t<a;t++){let n=e.curves[t];this.curves.push(n.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,a=this.curves.length;t<a;t++){let n=this.curves[t];e.curves.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,a=e.curves.length;t<a;t++){let n=e.curves[t];this.curves.push(new Ku[n.type]().fromJSON(n))}return this}},Ns=class extends Al{constructor(e){super(),this.type="Path",this.currentPoint=new fe,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,a=e.length;t<a;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let a=new Fs(this.currentPoint.clone(),new fe(e,t));return this.curves.push(a),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,a,n){let r=new ks(this.currentPoint.clone(),new fe(e,t),new fe(a,n));return this.curves.push(r),this.currentPoint.set(a,n),this}bezierCurveTo(e,t,a,n,r,s){let o=new Ds(this.currentPoint.clone(),new fe(e,t),new fe(a,n),new fe(r,s));return this.curves.push(o),this.currentPoint.set(r,s),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),a=new Us(t);return this.curves.push(a),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,a,n,r,s){let o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+o,t+l,a,n,r,s),this}absarc(e,t,a,n,r,s){return this.absellipse(e,t,a,a,n,r,s),this}ellipse(e,t,a,n,r,s,o,l){let c=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+c,t+u,a,n,r,s,o,l),this}absellipse(e,t,a,n,r,s,o,l){let c=new Lr(e,t,a,n,r,s,o,l);if(this.curves.length>0){let f=c.getPoint(0);f.equals(this.currentPoint)||this.lineTo(f.x,f.y)}this.curves.push(c);let u=c.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Cr=class extends Ns{constructor(e){super(e),this.uuid=ki(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let a=0,n=this.holes.length;a<n;a++)t[a]=this.holes[a].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,a=e.holes.length;t<a;t++){let n=e.holes[t];this.holes.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,a=this.holes.length;t<a;t++){let n=this.holes[t];e.holes.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,a=e.holes.length;t<a;t++){let n=e.holes[t];this.holes.push(new Ns().fromJSON(n))}return this}};function p0(i,e,t=2){let a=e&&e.length,n=a?e[0]*t:i.length,r=gm(i,0,n,t,!0),s=[];if(!r||r.next===r.prev)return s;let o,l,c;if(a&&(r=v0(i,e,r,t)),i.length>80*t){o=i[0],l=i[1];let u=o,f=l;for(let d=t;d<n;d+=t){let h=i[d],x=i[d+1];h<o&&(o=h),x<l&&(l=x),h>u&&(u=h),x>f&&(f=x)}c=Math.max(u-o,f-l),c=c!==0?32767/c:0}return Bs(r,s,t,o,l,c,0),s}function gm(i,e,t,a,n){let r;if(n===E0(i,e,t,a)>0)for(let s=e;s<t;s+=a)r=Sp(s/a|0,i[s],i[s+1],r);else for(let s=t-a;s>=e;s-=a)r=Sp(s/a|0,i[s],i[s+1],r);return r&&Ir(r,r.next)&&(zs(r),r=r.next),r}function Ei(i,e){if(!i)return i;e||(e=i);let t=i,a;do if(a=!1,!t.steiner&&(Ir(t,t.next)||Tt(t.prev,t,t.next)===0)){if(zs(t),t=e=t.prev,t===t.next)break;a=!0}else t=t.next;while(a||t!==e);return e}function Bs(i,e,t,a,n,r,s){if(!i)return;!s&&r&&M0(i,a,n,r);let o=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?g0(i,a,n,r):m0(i)){e.push(l.i,i.i,c.i),zs(i),i=c.next,o=c.next;continue}if(i=c,i===o){s?s===1?(i=x0(Ei(i),e),Bs(i,e,t,a,n,r,2)):s===2&&_0(i,e,t,a,n,r):Bs(Ei(i),e,t,a,n,r,1);break}}}function m0(i){let e=i.prev,t=i,a=i.next;if(Tt(e,t,a)>=0)return!1;let n=e.x,r=t.x,s=a.x,o=e.y,l=t.y,c=a.y,u=Math.min(n,r,s),f=Math.min(o,l,c),d=Math.max(n,r,s),h=Math.max(o,l,c),x=a.next;for(;x!==e;){if(x.x>=u&&x.x<=d&&x.y>=f&&x.y<=h&&fs(n,o,r,l,s,c,x.x,x.y)&&Tt(x.prev,x,x.next)>=0)return!1;x=x.next}return!0}function g0(i,e,t,a){let n=i.prev,r=i,s=i.next;if(Tt(n,r,s)>=0)return!1;let o=n.x,l=r.x,c=s.x,u=n.y,f=r.y,d=s.y,h=Math.min(o,l,c),x=Math.min(u,f,d),g=Math.max(o,l,c),p=Math.max(u,f,d),m=Ju(h,x,e,t,a),y=Ju(g,p,e,t,a),L=i.prevZ,v=i.nextZ;for(;L&&L.z>=m&&v&&v.z<=y;){if(L.x>=h&&L.x<=g&&L.y>=x&&L.y<=p&&L!==n&&L!==s&&fs(o,u,l,f,c,d,L.x,L.y)&&Tt(L.prev,L,L.next)>=0||(L=L.prevZ,v.x>=h&&v.x<=g&&v.y>=x&&v.y<=p&&v!==n&&v!==s&&fs(o,u,l,f,c,d,v.x,v.y)&&Tt(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;L&&L.z>=m;){if(L.x>=h&&L.x<=g&&L.y>=x&&L.y<=p&&L!==n&&L!==s&&fs(o,u,l,f,c,d,L.x,L.y)&&Tt(L.prev,L,L.next)>=0)return!1;L=L.prevZ}for(;v&&v.z<=y;){if(v.x>=h&&v.x<=g&&v.y>=x&&v.y<=p&&v!==n&&v!==s&&fs(o,u,l,f,c,d,v.x,v.y)&&Tt(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function x0(i,e){let t=i;do{let a=t.prev,n=t.next.next;!Ir(a,n)&&_m(a,t,t.next,n)&&Os(a,n)&&Os(n,a)&&(e.push(a.i,t.i,n.i),zs(t),zs(t.next),t=i=n),t=t.next}while(t!==i);return Ei(t)}function _0(i,e,t,a,n,r){let s=i;do{let o=s.next.next;for(;o!==s.prev;){if(s.i!==o.i&&I0(s,o)){let l=vm(s,o);s=Ei(s,s.next),l=Ei(l,l.next),Bs(s,e,t,a,n,r,0),Bs(l,e,t,a,n,r,0);return}o=o.next}s=s.next}while(s!==i)}function v0(i,e,t,a){let n=[];for(let r=0,s=e.length;r<s;r++){let o=e[r]*a,l=r<s-1?e[r+1]*a:i.length,c=gm(i,o,l,a,!1);c===c.next&&(c.steiner=!0),n.push(C0(c))}n.sort(b0);for(let r=0;r<n.length;r++)t=y0(n[r],t);return t}function b0(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let a=(i.next.y-i.y)/(i.next.x-i.x),n=(e.next.y-e.y)/(e.next.x-e.x);t=a-n}return t}function y0(i,e){let t=S0(i,e);if(!t)return e;let a=vm(t,i);return Ei(a,a.next),Ei(t,t.next)}function S0(i,e){let t=e,a=i.x,n=i.y,r=-1/0,s;if(Ir(i,t))return t;do{if(Ir(i,t.next))return t.next;if(n<=t.y&&n>=t.next.y&&t.next.y!==t.y){let f=t.x+(n-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(f<=a&&f>r&&(r=f,s=t.x<t.next.x?t:t.next,f===a))return s}t=t.next}while(t!==e);if(!s)return null;let o=s,l=s.x,c=s.y,u=1/0;t=s;do{if(a>=t.x&&t.x>=l&&a!==t.x&&xm(n<c?a:r,n,l,c,n<c?r:a,n,t.x,t.y)){let f=Math.abs(n-t.y)/(a-t.x);Os(t,i)&&(f<u||f===u&&(t.x>s.x||t.x===s.x&&w0(s,t)))&&(s=t,u=f)}t=t.next}while(t!==o);return s}function w0(i,e){return Tt(i.prev,i,e.prev)<0&&Tt(e.next,i,i.next)<0}function M0(i,e,t,a){let n=i;do n.z===0&&(n.z=Ju(n.x,n.y,e,t,a)),n.prevZ=n.prev,n.nextZ=n.next,n=n.next;while(n!==i);n.prevZ.nextZ=null,n.prevZ=null,L0(n)}function L0(i){let e,t=1;do{let a=i,n;i=null;let r=null;for(e=0;a;){e++;let s=a,o=0;for(let c=0;c<t&&(o++,s=s.nextZ,!!s);c++);let l=t;for(;o>0||l>0&&s;)o!==0&&(l===0||!s||a.z<=s.z)?(n=a,a=a.nextZ,o--):(n=s,s=s.nextZ,l--),r?r.nextZ=n:i=n,n.prevZ=r,r=n;a=s}r.nextZ=null,t*=2}while(e>1);return i}function Ju(i,e,t,a,n){return i=(i-t)*n|0,e=(e-a)*n|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function C0(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function xm(i,e,t,a,n,r,s,o){return(n-s)*(e-o)>=(i-s)*(r-o)&&(i-s)*(a-o)>=(t-s)*(e-o)&&(t-s)*(r-o)>=(n-s)*(a-o)}function fs(i,e,t,a,n,r,s,o){return!(i===s&&e===o)&&xm(i,e,t,a,n,r,s,o)}function I0(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!T0(i,e)&&(Os(i,e)&&Os(e,i)&&A0(i,e)&&(Tt(i.prev,i,e.prev)||Tt(i,e.prev,e))||Ir(i,e)&&Tt(i.prev,i,i.next)>0&&Tt(e.prev,e,e.next)>0)}function Tt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Ir(i,e){return i.x===e.x&&i.y===e.y}function _m(i,e,t,a){let n=rl(Tt(i,e,t)),r=rl(Tt(i,e,a)),s=rl(Tt(t,a,i)),o=rl(Tt(t,a,e));return!!(n!==r&&s!==o||n===0&&il(i,t,e)||r===0&&il(i,a,e)||s===0&&il(t,i,a)||o===0&&il(t,e,a))}function il(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function rl(i){return i>0?1:i<0?-1:0}function T0(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&_m(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function Os(i,e){return Tt(i.prev,i,i.next)<0?Tt(i,e,i.next)>=0&&Tt(i,i.prev,e)>=0:Tt(i,e,i.prev)<0||Tt(i,i.next,e)<0}function A0(i,e){let t=i,a=!1,n=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&n<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(a=!a),t=t.next;while(t!==i);return a}function vm(i,e){let t=$u(i.i,i.x,i.y),a=$u(e.i,e.x,e.y),n=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=n,n.prev=t,a.next=t,t.prev=a,r.next=a,a.prev=r,a}function Sp(i,e,t,a){let n=$u(i,e,t);return a?(n.next=a.next,n.prev=a,a.next.prev=n,a.next=n):(n.prev=n,n.next=n),n}function zs(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function $u(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function E0(i,e,t,a){let n=0;for(let r=e,s=t-a;r<t;r+=a)n+=(i[s]-i[r])*(i[r+1]+i[s+1]),s=r;return n}var Qu=class{static triangulate(e,t,a=2){return p0(e,t,a)}},Ti=class i{static area(e){let t=e.length,a=0;for(let n=t-1,r=0;r<t;n=r++)a+=e[n].x*e[r].y-e[r].x*e[n].y;return a*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let a=[],n=[],r=[];wp(e),Mp(a,e);let s=e.length;t.forEach(wp);for(let l=0;l<t.length;l++)n.push(s),s+=t[l].length,Mp(a,t[l]);let o=Qu.triangulate(a,n);for(let l=0;l<o.length;l+=3)r.push(o.slice(l,l+3));return r}};function wp(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Mp(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var Hs=class i extends aa{constructor(e=new Cr([new fe(.5,.5),new fe(-.5,.5),new fe(-.5,-.5),new fe(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let a=this,n=[],r=[];for(let o=0,l=e.length;o<l;o++){let c=e[o];s(c)}this.setAttribute("position",new Bt(n,3)),this.setAttribute("uv",new Bt(r,2)),this.computeVertexNormals();function s(o){let l=[],c=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,f=t.depth!==void 0?t.depth:1,d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,h=t.bevelThickness!==void 0?t.bevelThickness:.2,x=t.bevelSize!==void 0?t.bevelSize:h-.1,g=t.bevelOffset!==void 0?t.bevelOffset:0,p=t.bevelSegments!==void 0?t.bevelSegments:3,m=t.extrudePath,y=t.UVGenerator!==void 0?t.UVGenerator:R0,L,v=!1,S,w,I,_;if(m){L=m.getSpacedPoints(u),v=!0,d=!1;let ne=m.isCatmullRomCurve3?m.closed:!1;S=m.computeFrenetFrames(u,ne),w=new O,I=new O,_=new O}d||(p=0,h=0,x=0,g=0);let C=o.extractPoints(c),A=C.shape,E=C.holes;if(!Ti.isClockWise(A)){A=A.reverse();for(let ne=0,se=E.length;ne<se;ne++){let oe=E[ne];Ti.isClockWise(oe)&&(E[ne]=oe.reverse())}}function U(ne){let oe=10000000000000001e-36,le=ne[0];for(let de=1;de<=ne.length;de++){let Ne=de%ne.length,Ue=ne[Ne],Ge=Ue.x-le.x,Ze=Ue.y-le.y,D=Ge*Ge+Ze*Ze,ut=Math.max(Math.abs(Ue.x),Math.abs(Ue.y),Math.abs(le.x),Math.abs(le.y)),et=oe*ut*ut;if(D<=et){ne.splice(Ne,1),de--;continue}le=Ue}}U(A),E.forEach(U);let R=E.length,B=A;for(let ne=0;ne<R;ne++){let se=E[ne];A=A.concat(se)}function q(ne,se,oe){return se||He("ExtrudeGeometry: vec does not exist"),ne.clone().addScaledVector(se,oe)}let H=A.length;function te(ne,se,oe){let le,de,Ne,Ue=ne.x-se.x,Ge=ne.y-se.y,Ze=oe.x-ne.x,D=oe.y-ne.y,ut=Ue*Ue+Ge*Ge,et=Ue*D-Ge*Ze;if(Math.abs(et)>Number.EPSILON){let T=Math.sqrt(ut),b=Math.sqrt(Ze*Ze+D*D),z=se.x-Ge/T,W=se.y+Ue/T,Z=oe.x-D/b,ce=oe.y+Ze/b,ue=((Z-z)*D-(ce-W)*Ze)/(Ue*D-Ge*Ze);le=z+Ue*ue-ne.x,de=W+Ge*ue-ne.y;let K=le*le+de*de;if(K<=2)return new fe(le,de);Ne=Math.sqrt(K/2)}else{let T=!1;Ue>Number.EPSILON?Ze>Number.EPSILON&&(T=!0):Ue<-Number.EPSILON?Ze<-Number.EPSILON&&(T=!0):Math.sign(Ge)===Math.sign(D)&&(T=!0),T?(le=-Ge,de=Ue,Ne=Math.sqrt(ut)):(le=Ue,de=Ge,Ne=Math.sqrt(ut/2))}return new fe(le/Ne,de/Ne)}let Y=[];for(let ne=0,se=B.length,oe=se-1,le=ne+1;ne<se;ne++,oe++,le++)oe===se&&(oe=0),le===se&&(le=0),Y[ne]=te(B[ne],B[oe],B[le]);let $=[],j,Ce=Y.concat();for(let ne=0,se=R;ne<se;ne++){let oe=E[ne];j=[];for(let le=0,de=oe.length,Ne=de-1,Ue=le+1;le<de;le++,Ne++,Ue++)Ne===de&&(Ne=0),Ue===de&&(Ue=0),j[le]=te(oe[le],oe[Ne],oe[Ue]);$.push(j),Ce=Ce.concat(j)}let Me;if(p===0)Me=Ti.triangulateShape(B,E);else{let ne=[],se=[];for(let oe=0;oe<p;oe++){let le=oe/p,de=h*Math.cos(le*Math.PI/2),Ne=x*Math.sin(le*Math.PI/2)+g;for(let Ue=0,Ge=B.length;Ue<Ge;Ue++){let Ze=q(B[Ue],Y[Ue],Ne);ve(Ze.x,Ze.y,-de),le===0&&ne.push(Ze)}for(let Ue=0,Ge=R;Ue<Ge;Ue++){let Ze=E[Ue];j=$[Ue];let D=[];for(let ut=0,et=Ze.length;ut<et;ut++){let T=q(Ze[ut],j[ut],Ne);ve(T.x,T.y,-de),le===0&&D.push(T)}le===0&&se.push(D)}}Me=Ti.triangulateShape(ne,se)}let Je=Me.length,qe=x+g;for(let ne=0;ne<H;ne++){let se=d?q(A[ne],Ce[ne],qe):A[ne];v?(I.copy(S.normals[0]).multiplyScalar(se.x),w.copy(S.binormals[0]).multiplyScalar(se.y),_.copy(L[0]).add(I).add(w),ve(_.x,_.y,_.z)):ve(se.x,se.y,0)}for(let ne=1;ne<=u;ne++)for(let se=0;se<H;se++){let oe=d?q(A[se],Ce[se],qe):A[se];v?(I.copy(S.normals[ne]).multiplyScalar(oe.x),w.copy(S.binormals[ne]).multiplyScalar(oe.y),_.copy(L[ne]).add(I).add(w),ve(_.x,_.y,_.z)):ve(oe.x,oe.y,f/u*ne)}for(let ne=p-1;ne>=0;ne--){let se=ne/p,oe=h*Math.cos(se*Math.PI/2),le=x*Math.sin(se*Math.PI/2)+g;for(let de=0,Ne=B.length;de<Ne;de++){let Ue=q(B[de],Y[de],le);ve(Ue.x,Ue.y,f+oe)}for(let de=0,Ne=E.length;de<Ne;de++){let Ue=E[de];j=$[de];for(let Ge=0,Ze=Ue.length;Ge<Ze;Ge++){let D=q(Ue[Ge],j[Ge],le);v?ve(D.x,D.y+L[u-1].y,L[u-1].x+oe):ve(D.x,D.y,f+oe)}}}ot(),J();function ot(){let ne=n.length/3;if(d){let se=0,oe=H*se;for(let le=0;le<Je;le++){let de=Me[le];ze(de[2]+oe,de[1]+oe,de[0]+oe)}se=u+p*2,oe=H*se;for(let le=0;le<Je;le++){let de=Me[le];ze(de[0]+oe,de[1]+oe,de[2]+oe)}}else{for(let se=0;se<Je;se++){let oe=Me[se];ze(oe[2],oe[1],oe[0])}for(let se=0;se<Je;se++){let oe=Me[se];ze(oe[0]+H*u,oe[1]+H*u,oe[2]+H*u)}}a.addGroup(ne,n.length/3-ne,0)}function J(){let ne=n.length/3,se=0;ae(B,se),se+=B.length;for(let oe=0,le=E.length;oe<le;oe++){let de=E[oe];ae(de,se),se+=de.length}a.addGroup(ne,n.length/3-ne,1)}function ae(ne,se){let oe=ne.length;for(;--oe>=0;){let le=oe,de=oe-1;de<0&&(de=ne.length-1);for(let Ne=0,Ue=u+p*2;Ne<Ue;Ne++){let Ge=H*Ne,Ze=H*(Ne+1),D=se+le+Ge,ut=se+de+Ge,et=se+de+Ze,T=se+le+Ze;we(D,ut,et,T)}}}function ve(ne,se,oe){l.push(ne),l.push(se),l.push(oe)}function ze(ne,se,oe){Ve(ne),Ve(se),Ve(oe);let le=n.length/3,de=y.generateTopUV(a,n,le-3,le-2,le-1);pt(de[0]),pt(de[1]),pt(de[2])}function we(ne,se,oe,le){Ve(ne),Ve(se),Ve(le),Ve(se),Ve(oe),Ve(le);let de=n.length/3,Ne=y.generateSideWallUV(a,n,de-6,de-3,de-2,de-1);pt(Ne[0]),pt(Ne[1]),pt(Ne[3]),pt(Ne[1]),pt(Ne[2]),pt(Ne[3])}function Ve(ne){n.push(l[ne*3+0]),n.push(l[ne*3+1]),n.push(l[ne*3+2])}function pt(ne){r.push(ne.x),r.push(ne.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,a=this.parameters.options;return P0(t,a,e)}static fromJSON(e,t){let a=[];for(let r=0,s=e.shapes.length;r<s;r++){let o=t[e.shapes[r]];a.push(o)}let n=e.options.extrudePath;return n!==void 0&&(e.options.extrudePath=new Ku[n.type]().fromJSON(n)),new i(a,e.options)}},R0={generateTopUV:function(i,e,t,a,n){let r=e[t*3],s=e[t*3+1],o=e[a*3],l=e[a*3+1],c=e[n*3],u=e[n*3+1];return[new fe(r,s),new fe(o,l),new fe(c,u)]},generateSideWallUV:function(i,e,t,a,n,r){let s=e[t*3],o=e[t*3+1],l=e[t*3+2],c=e[a*3],u=e[a*3+1],f=e[a*3+2],d=e[n*3],h=e[n*3+1],x=e[n*3+2],g=e[r*3],p=e[r*3+1],m=e[r*3+2];return Math.abs(o-u)<Math.abs(s-c)?[new fe(s,1-l),new fe(c,1-f),new fe(d,1-x),new fe(g,1-m)]:[new fe(o,1-l),new fe(u,1-f),new fe(h,1-x),new fe(p,1-m)]}};function P0(i,e,t){if(t.shapes=[],Array.isArray(i))for(let a=0,n=i.length;a<n;a++){let r=i[a];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var ia=class i extends aa{constructor(e=1,t=1,a=1,n=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:a,heightSegments:n};let r=e/2,s=t/2,o=Math.floor(a),l=Math.floor(n),c=o+1,u=l+1,f=e/o,d=t/l,h=[],x=[],g=[],p=[];for(let m=0;m<u;m++){let y=m*d-s;for(let L=0;L<c;L++){let v=L*f-r;x.push(v,-y,0),g.push(0,0,1),p.push(L/o),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let y=0;y<o;y++){let L=y+c*m,v=y+c*(m+1),S=y+1+c*(m+1),w=y+1+c*m;h.push(L,v,w),h.push(v,S,w)}this.setIndex(h),this.setAttribute("position",new Bt(x,3)),this.setAttribute("normal",new Bt(g,3)),this.setAttribute("uv",new Bt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}};var Vs=class i extends aa{constructor(e=1,t=32,a=16,n=0,r=Math.PI*2,s=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:a,phiStart:n,phiLength:r,thetaStart:s,thetaLength:o},t=Math.max(3,Math.floor(t)),a=Math.max(2,Math.floor(a));let l=Math.min(s+o,Math.PI),c=0,u=[],f=new O,d=new O,h=[],x=[],g=[],p=[];for(let m=0;m<=a;m++){let y=[],L=m/a,v=s+L*o,S=e*Math.cos(v),w=Math.sqrt(e*e-S*S),I=0;m===0&&s===0?I=.5/t:m===a&&l===Math.PI&&(I=-.5/t);for(let _=0;_<=t;_++){let C=_/t,A=n+C*r;f.x=-w*Math.cos(A),f.y=S,f.z=w*Math.sin(A),x.push(f.x,f.y,f.z),d.copy(f).normalize(),g.push(d.x,d.y,d.z),p.push(C+I,1-L),y.push(c++)}u.push(y)}for(let m=0;m<a;m++)for(let y=0;y<t;y++){let L=u[m][y+1],v=u[m][y],S=u[m+1][y],w=u[m+1][y+1];(m!==0||s>0)&&h.push(L,v,w),(m!==a-1||l<Math.PI)&&h.push(v,S,w)}this.setIndex(h),this.setAttribute("position",new Bt(x,3)),this.setAttribute("normal",new Bt(g,3)),this.setAttribute("uv",new Bt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Gs=class i extends aa{constructor(e=1,t=.4,a=12,n=48,r=Math.PI*2,s=0,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:a,tubularSegments:n,arc:r,thetaStart:s,thetaLength:o},a=Math.floor(a),n=Math.floor(n);let l=[],c=[],u=[],f=[],d=new O,h=new O,x=new O;for(let g=0;g<=a;g++){let p=s+g/a*o;for(let m=0;m<=n;m++){let y=m/n*r;h.x=(e+t*Math.cos(p))*Math.cos(y),h.y=(e+t*Math.cos(p))*Math.sin(y),h.z=t*Math.sin(p),c.push(h.x,h.y,h.z),d.x=e*Math.cos(y),d.y=e*Math.sin(y),x.subVectors(h,d).normalize(),u.push(x.x,x.y,x.z),f.push(m/n),f.push(g/a)}}for(let g=1;g<=a;g++)for(let p=1;p<=n;p++){let m=(n+1)*g+p-1,y=(n+1)*(g-1)+p-1,L=(n+1)*(g-1)+p,v=(n+1)*g+p;l.push(m,y,v),l.push(y,L,v)}this.setIndex(l),this.setAttribute("position",new Bt(c,3)),this.setAttribute("normal",new Bt(u,3)),this.setAttribute("uv",new Bt(f,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc,e.thetaStart,e.thetaLength)}};function Ui(i){let e={};for(let t in i){e[t]={};for(let a in i[t]){let n=i[t][a];if(Lp(n))n.isRenderTargetTexture?(Oe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][a]=null):e[t][a]=n.clone();else if(Array.isArray(n))if(Lp(n[0])){let r=[];for(let s=0,o=n.length;s<o;s++)r[s]=n[s].clone();e[t][a]=r}else e[t][a]=n.slice();else e[t][a]=n}}return e}function ra(i){let e={};for(let t=0;t<i.length;t++){let a=Ui(i[t]);for(let n in a)e[n]=a[n]}return e}function Lp(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function D0(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ld(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:rt.workingColorSpace}var bm={clone:Ui,merge:ra},F0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,k0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ia=class extends xn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=F0,this.fragmentShader=k0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ui(e.uniforms),this.uniformsGroups=D0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let s=this.uniforms[n].value;s&&s.isTexture?t.uniforms[n]={type:"t",value:s.toJSON(e).uuid}:s&&s.isColor?t.uniforms[n]={type:"c",value:s.getHex()}:s&&s.isVector2?t.uniforms[n]={type:"v2",value:s.toArray()}:s&&s.isVector3?t.uniforms[n]={type:"v3",value:s.toArray()}:s&&s.isVector4?t.uniforms[n]={type:"v4",value:s.toArray()}:s&&s.isMatrix3?t.uniforms[n]={type:"m3",value:s.toArray()}:s&&s.isMatrix4?t.uniforms[n]={type:"m4",value:s.toArray()}:t.uniforms[n]={value:s}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let a={};for(let n in this.extensions)this.extensions[n]===!0&&(a[n]=!0);return Object.keys(a).length>0&&(t.extensions=a),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let a in e.uniforms){let n=e.uniforms[a];switch(this.uniforms[a]={},n.type){case"t":this.uniforms[a].value=t[n.value]||null;break;case"c":this.uniforms[a].value=new Xe().setHex(n.value);break;case"v2":this.uniforms[a].value=new fe().fromArray(n.value);break;case"v3":this.uniforms[a].value=new O().fromArray(n.value);break;case"v4":this.uniforms[a].value=new Ct().fromArray(n.value);break;case"m3":this.uniforms[a].value=new Ye().fromArray(n.value);break;case"m4":this.uniforms[a].value=new xt().fromArray(n.value);break;default:this.uniforms[a].value=n.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let a in e.extensions)this.extensions[a]=e.extensions[a];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},El=class extends Ia{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}},Na=class extends xn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Xe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Xe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=so,this.normalScale=new fe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Ws=class extends Na{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new fe(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return je(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Xe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Xe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Xe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var qs=class extends xn{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new Xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Xe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=so,this.normalScale=new fe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Xl,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Rl=class extends xn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=tm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Pl=class extends xn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function fr(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function Vu(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}var ni=class{constructor(e,t,a,n){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=n!==void 0?n:new t.constructor(a),this.sampleValues=t,this.valueSize=a,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,a=this._cachedIndex,n=t[a],r=t[a-1];a:{e:{let s;t:{n:if(!(e<n)){for(let o=a+2;;){if(n===void 0){if(e<r)break n;return a=t.length,this._cachedIndex=a,this.copySampleValue_(a-1)}if(a===o)break;if(r=n,n=t[++a],e<n)break e}s=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(a=2,r=o);for(let l=a-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(a===l)break;if(n=r,r=t[--a-1],e>=r)break e}s=a,a=0;break t}break a}for(;a<s;){let o=a+s>>>1;e<t[o]?s=o:a=o+1}if(n=t[a],r=t[a-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===void 0)return a=t.length,this._cachedIndex=a,this.copySampleValue_(a-1)}this._cachedIndex=a,this.intervalChanged_(a,r,n)}return this.interpolate_(a,r,e,n)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,a=this.sampleValues,n=this.valueSize,r=e*n;for(let s=0;s!==n;++s)t[s]=a[r+s];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Dl=class extends ni{constructor(e,t,a,n){super(e,t,a,n),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:qu,endingEnd:qu}}intervalChanged_(e,t,a){let n=this.parameterPositions,r=e-2,s=e+1,o=n[r],l=n[s];if(o===void 0)switch(this.getSettings_().endingStart){case Xu:r=e,o=2*t-a;break;case Yu:r=n.length-2,o=t+n[r]-n[r+1];break;default:r=e,o=a}if(l===void 0)switch(this.getSettings_().endingEnd){case Xu:s=e,l=2*a-t;break;case Yu:s=1,l=a+n[1]-n[0];break;default:s=e-1,l=t}let c=(a-t)*.5,u=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(l-a),this._offsetPrev=r*u,this._offsetNext=s*u}interpolate_(e,t,a,n){let r=this.resultBuffer,s=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this._offsetPrev,f=this._offsetNext,d=this._weightPrev,h=this._weightNext,x=(a-t)/(n-t),g=x*x,p=g*x,m=-d*p+2*d*g-d*x,y=(1+d)*p+(-1.5-2*d)*g+(-.5+d)*x+1,L=(-1-h)*p+(1.5+h)*g+.5*x,v=h*p-h*g;for(let S=0;S!==o;++S)r[S]=m*s[u+S]+y*s[c+S]+L*s[l+S]+v*s[f+S];return r}},Fl=class extends ni{constructor(e,t,a,n){super(e,t,a,n)}interpolate_(e,t,a,n){let r=this.resultBuffer,s=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=(a-t)/(n-t),f=1-u;for(let d=0;d!==o;++d)r[d]=s[c+d]*f+s[l+d]*u;return r}},kl=class extends ni{constructor(e,t,a,n){super(e,t,a,n)}interpolate_(e){return this.copySampleValue_(e-1)}},Ul=class extends ni{interpolate_(e,t,a,n){let r=this.resultBuffer,s=this.sampleValues,o=this.valueSize,l=e*o,c=l-o,u=this.inTangents,f=this.outTangents;if(!u||!f){let x=(a-t)/(n-t),g=1-x;for(let p=0;p!==o;++p)r[p]=s[c+p]*g+s[l+p]*x;return r}let d=o*2,h=e-1;for(let x=0;x!==o;++x){let g=s[c+x],p=s[l+x],m=h*d+x*2,y=f[m],L=f[m+1],v=e*d+x*2,S=u[v],w=u[v+1],I=N0(a,t,y,S,n);r[x]=ym(I,g,L,w,p)}return r}};function ym(i,e,t,a,n){let r=1-i;return r*r*r*e+3*r*r*i*t+3*r*i*i*a+i*i*i*n}function U0(i,e,t,a,n){let r=1-i;return 3*r*r*(t-e)+6*r*i*(a-t)+3*i*i*(n-a)}function N0(i,e,t,a,n){let r=(i-e)/(n-e);for(let s=0;s<8;s++){let o=ym(r,e,t,a,n)-i;if(Math.abs(o)<1e-10)break;let l=U0(r,e,t,a,n);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-o/l))}return r}var Ta=class{constructor(e,t,a,n){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=fr(t,this.TimeBufferType),this.values=fr(a,this.ValueBufferType),this.setInterpolation(n||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,a;if(t.toJSON!==this.toJSON)a=t.toJSON(e);else{a={name:e.name,times:fr(e.times,Array),values:fr(e.values,Array)};let n=e.getInterpolation();n!==e.DefaultInterpolation&&(a.interpolation=n),Vu(e.settings)&&(a.settings={inTangents:fr(e.settings.inTangents,Array),outTangents:fr(e.settings.outTangents,Array)})}return a.type=e.ValueTypeName,a}InterpolantFactoryMethodDiscrete(e){return new kl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Fl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Dl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Ul(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case xs:t=this.InterpolantFactoryMethodDiscrete;break;case vl:t=this.InterpolantFactoryMethodLinear;break;case ll:t=this.InterpolantFactoryMethodSmooth;break;case Wu:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let a="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(a);return Oe("KeyframeTrack:",a),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return xs;case this.InterpolantFactoryMethodLinear:return vl;case this.InterpolantFactoryMethodSmooth:return ll;case this.InterpolantFactoryMethodBezier:return Wu}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let a=0,n=t.length;a!==n;++a)t[a]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let a=0,n=t.length;a!==n;++a)t[a]*=e;Vu(this.settings)&&(Cp(this.settings.inTangents,e),Cp(this.settings.outTangents,e))}return this}trim(e,t){let a=this.times,n=a.length,r=0,s=n-1;for(;r!==n&&a[r]<e;)++r;for(;s!==-1&&a[s]>t;)--s;if(++s,r!==0||s!==n){r>=s&&(s=Math.max(s,1),r=s-1);let o=this.getValueSize();this.times=a.slice(r,s),this.values=this.values.slice(r*o,s*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(He("KeyframeTrack: Invalid value size in track.",this),e=!1);let a=this.times,n=this.values,r=a.length;r===0&&(He("KeyframeTrack: Track is empty.",this),e=!1);let s=null;for(let o=0;o!==r;o++){let l=a[o];if(typeof l=="number"&&isNaN(l)){He("KeyframeTrack: Time is not a valid number.",this,o,l),e=!1;break}if(s!==null&&s>l){He("KeyframeTrack: Out of order keys.",this,o,l,s),e=!1;break}s=l}if(n!==void 0&&Lx(n))for(let o=0,l=n.length;o!==l;++o){let c=n[o];if(isNaN(c)){He("KeyframeTrack: Value is not a valid number.",this,o,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),a=this.getValueSize(),n=this.getInterpolation()===ll,r=e.length-1,s=1;for(let o=1;o<r;++o){let l=!1,c=e[o],u=e[o+1];if(c!==u&&(o!==1||c!==e[0]))if(n)l=!0;else{let f=o*a,d=f-a,h=f+a;for(let x=0;x!==a;++x){let g=t[f+x];if(g!==t[d+x]||g!==t[h+x]){l=!0;break}}}if(l){if(o!==s){e[s]=e[o];let f=o*a,d=s*a;for(let h=0;h!==a;++h)t[d+h]=t[f+h]}++s}}if(r>0){e[s]=e[r];for(let o=r*a,l=s*a,c=0;c!==a;++c)t[l+c]=t[o+c];++s}return s!==e.length?(this.times=e.slice(0,s),this.values=t.slice(0,s*a)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),a=this.constructor,n=new a(this.name,e,t);return n.createInterpolant=this.createInterpolant,Vu(this.settings)&&(n.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),n}};function Cp(i,e){for(let t=0,a=i.length;t!==a;t+=2)i[t]*=e}Ta.prototype.ValueTypeName="";Ta.prototype.TimeBufferType=Float32Array;Ta.prototype.ValueBufferType=Float32Array;Ta.prototype.DefaultInterpolation=vl;var ii=class extends Ta{constructor(e,t,a){super(e,t,a)}};ii.prototype.ValueTypeName="bool";ii.prototype.ValueBufferType=Array;ii.prototype.DefaultInterpolation=xs;ii.prototype.InterpolantFactoryMethodLinear=void 0;ii.prototype.InterpolantFactoryMethodSmooth=void 0;var Nl=class extends Ta{constructor(e,t,a,n){super(e,t,a,n)}};Nl.prototype.ValueTypeName="color";var Bl=class extends Ta{constructor(e,t,a,n){super(e,t,a,n)}};Bl.prototype.ValueTypeName="number";var Ol=class extends ni{constructor(e,t,a,n){super(e,t,a,n)}interpolate_(e,t,a,n){let r=this.resultBuffer,s=this.sampleValues,o=this.valueSize,l=(a-t)/(n-t),c=e*o;for(let u=c+o;c!==u;c+=4)pn.slerpFlat(r,0,s,c-o,s,c,l);return r}},Xs=class extends Ta{constructor(e,t,a,n){super(e,t,a,n)}InterpolantFactoryMethodLinear(e){return new Ol(this.times,this.values,this.getValueSize(),e)}};Xs.prototype.ValueTypeName="quaternion";Xs.prototype.InterpolantFactoryMethodSmooth=void 0;var ri=class extends Ta{constructor(e,t,a){super(e,t,a)}};ri.prototype.ValueTypeName="string";ri.prototype.ValueBufferType=Array;ri.prototype.DefaultInterpolation=xs;ri.prototype.InterpolantFactoryMethodLinear=void 0;ri.prototype.InterpolantFactoryMethodSmooth=void 0;var zl=class extends Ta{constructor(e,t,a,n){super(e,t,a,n)}};zl.prototype.ValueTypeName="vector";var Hl=class{constructor(e,t,a){let n=this,r=!1,s=0,o=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=a,this._abortController=null,this.itemStart=function(u){o++,r===!1&&n.onStart!==void 0&&n.onStart(u,s,o),r=!0},this.itemEnd=function(u){s++,n.onProgress!==void 0&&n.onProgress(u,s,o),s===o&&(r=!1,n.onLoad!==void 0&&n.onLoad())},this.itemError=function(u){n.onError!==void 0&&n.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,f){return c.push(u,f),this},this.removeHandler=function(u){let f=c.indexOf(u);return f!==-1&&c.splice(f,2),this},this.getHandler=function(u){for(let f=0,d=c.length;f<d;f+=2){let h=c[f],x=c[f+1];if(h.global&&(h.lastIndex=0),h.test(u))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Sm=new Hl,Vl=class{constructor(e){this.manager=e!==void 0?e:Sm,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let a=this;return new Promise(function(n,r){a.load(e,n,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Vl.DEFAULT_MATERIAL_NAME="__DEFAULT";var Tr=class extends Zt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Xe(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}};var Gu=new xt,Ip=new O,Tp=new O,Ys=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new fe(512,512),this.mapType=xa,this.map=null,this.mapPass=null,this.matrix=new xt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new wr,this._frameExtents=new fe(1,1),this._viewportCount=1,this._viewports=[new Ct(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;Ip.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ip),Tp.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Tp),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,a,n){Gu.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),a.setFromProjectionMatrix(Gu,e.coordinateSystem,e.reversedDepth);let r=this._frameExtents,s=n?n.z/r.x:1,o=n?n.w/r.y:1,l=n?n.x/r.x:0,c=n?n.y/r.y:0;e.coordinateSystem===_r||e.reversedDepth?t.set(.5*s,0,0,.5*s+l,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):t.set(.5*s,0,0,.5*s+l,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),t.multiply(Gu)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},sl=new O,ol=new pn,un=new O,Zs=class extends Zt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new xt,this.projectionMatrix=new xt,this.projectionMatrixInverse=new xt,this.coordinateSystem=$a,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(sl,ol,un),un.x===1&&un.y===1&&un.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(sl,ol,un.set(1,1,1)).invert()}updateWorldMatrix(e,t,a=!1){super.updateWorldMatrix(e,t,a),this.matrixWorld.decompose(sl,ol,un),un.x===1&&un.y===1&&un.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(sl,ol,un.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},ei=new O,Ap=new fe,Ep=new fe,zt=class extends Zs{constructor(e=50,t=1,a=.1,n=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=a,this.far=n,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=br*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(hs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return br*2*Math.atan(Math.tan(hs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,a){ei.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ei.x,ei.y).multiplyScalar(-e/ei.z),ei.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),a.set(ei.x,ei.y).multiplyScalar(-e/ei.z)}getViewSize(e,t){return this.getViewBounds(e,Ap,Ep),t.subVectors(Ep,Ap)}setViewOffset(e,t,a,n,r,s){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=a,this.view.offsetY=n,this.view.width=r,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(hs*.5*this.fov)/this.zoom,a=2*t,n=this.aspect*a,r=-.5*n,s=this.view;if(this.view!==null&&this.view.enabled){let l=s.fullWidth,c=s.fullHeight;r+=s.offsetX*n/l,t-=s.offsetY*a/c,n*=s.width/l,a*=s.height/c}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+n,t,t-a,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var ju=class extends Ys{constructor(){super(new zt(90,1,.5,500)),this.isPointLightShadow=!0}},si=class extends Tr{constructor(e,t,a=0,n=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=a,this.decay=n,this.shadow=new ju}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},Ar=class extends Zs{constructor(e=-1,t=1,a=1,n=-1,r=.1,s=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=a,this.bottom=n,this.near=r,this.far=s,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,a,n,r,s){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=a,this.view.offsetY=n,this.view.width=r,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),a=(this.right+this.left)/2,n=(this.top+this.bottom)/2,r=a-e,s=a+e,o=n+t,l=n-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,s=r+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(r,s,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},ed=class extends Ys{constructor(){super(new Ar(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ri=class extends Tr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Zt.DEFAULT_UP),this.updateMatrix(),this.target=new Zt,this.shadow=new ed}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Pi=class extends Tr{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}};var hr=-90,pr=1,Gl=class extends Zt{constructor(e,t,a){super(),this.type="CubeCamera",this.renderTarget=a,this.coordinateSystem=null,this.activeMipmapLevel=0;let n=new zt(hr,pr,e,t);n.layers=this.layers,this.add(n);let r=new zt(hr,pr,e,t);r.layers=this.layers,this.add(r);let s=new zt(hr,pr,e,t);s.layers=this.layers,this.add(s);let o=new zt(hr,pr,e,t);o.layers=this.layers,this.add(o);let l=new zt(hr,pr,e,t);l.layers=this.layers,this.add(l);let c=new zt(hr,pr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[a,n,r,s,o,l]=t;for(let c of t)this.remove(c);if(e===$a)a.up.set(0,1,0),a.lookAt(1,0,0),n.up.set(0,1,0),n.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),s.up.set(0,0,1),s.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===_r)a.up.set(0,-1,0),a.lookAt(-1,0,0),n.up.set(0,-1,0),n.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),s.up.set(0,0,-1),s.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:a,activeMipmapLevel:n}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,s,o,l,c,u]=this.children,f=e.getRenderTarget(),d=e.getActiveCubeFace(),h=e.getActiveMipmapLevel(),x=e.xr.enabled;e.xr.enabled=!1;let g=a.texture.generateMipmaps;a.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(a,0,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(a,1,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(a,2,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(a,3,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(a,4,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),a.texture.generateMipmaps=g,e.setRenderTarget(a,5,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(f,d,h),e.xr.enabled=x,a.texture.needsPMREMUpdate=!0}},Wl=class extends zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var Cd="\\[\\]\\.:\\/",B0=new RegExp("["+Cd+"]","g"),Id="[^"+Cd+"]",O0="[^"+Cd.replace("\\.","")+"]",z0=/((?:WC+[\/:])*)/.source.replace("WC",Id),H0=/(WCOD+)?/.source.replace("WCOD",O0),V0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Id),G0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Id),W0=new RegExp("^"+z0+H0+V0+G0+"$"),q0=["material","materials","bones","map"],td=class{constructor(e,t,a){let n=a||Lt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,n)}getValue(e,t){this.bind();let a=this._targetGroup.nCachedObjects_,n=this._bindings[a];n!==void 0&&n.getValue(e,t)}setValue(e,t){let a=this._bindings;for(let n=this._targetGroup.nCachedObjects_,r=a.length;n!==r;++n)a[n].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,a=e.length;t!==a;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,a=e.length;t!==a;++t)e[t].unbind()}},Lt=class i{constructor(e,t,a){this.path=t,this.parsedPath=a||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,a){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,a):new i(e,t,a)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(B0,"")}static parseTrackName(e){let t=W0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let a={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},n=a.nodeName&&a.nodeName.lastIndexOf(".");if(n!==void 0&&n!==-1){let r=a.nodeName.substring(n+1);q0.indexOf(r)!==-1&&(a.nodeName=a.nodeName.substring(0,n),a.objectName=r)}if(a.propertyName===null||a.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return a}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let a=e.skeleton.getBoneByName(t);if(a!==void 0)return a}if(e.children){let a=function(r){for(let s=0;s<r.length;s++){let o=r[s];if(o.name===t||o.uuid===t)return o;let l=a(o.children);if(l)return l}return null},n=a(e.children);if(n)return n}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let a=this.resolvedProperty;for(let n=0,r=a.length;n!==r;++n)e[t++]=a[n]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let a=this.resolvedProperty;for(let n=0,r=a.length;n!==r;++n)a[n]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let a=this.resolvedProperty;for(let n=0,r=a.length;n!==r;++n)a[n]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let a=this.resolvedProperty;for(let n=0,r=a.length;n!==r;++n)a[n]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,a=t.objectName,n=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Oe("PropertyBinding: No target node found for track: "+this.path+".");return}if(a){let c=t.objectIndex;switch(a){case"materials":if(!e.material){He("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){He("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){He("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){He("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){He("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[a]===void 0){He("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[a]}if(c!==void 0){if(e[c]===void 0){He("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let s=e[n];if(s===void 0){let c=t.nodeName;He("PropertyBinding: Trying to update property for track: "+c+"."+n+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(n==="morphTargetInfluences"){if(!e.geometry){He("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){He("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=s,this.propertyIndex=r}else s.fromArray!==void 0&&s.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=s):Array.isArray(s)?(l=this.BindingType.EntireArray,this.resolvedProperty=s):this.propertyName=n;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Lt.Composite=td;Lt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Lt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Lt.prototype.GetterByBindingType=[Lt.prototype._getValue_direct,Lt.prototype._getValue_array,Lt.prototype._getValue_arrayElement,Lt.prototype._getValue_toArray];Lt.prototype.SetterByBindingTypeAndVersioning=[[Lt.prototype._setValue_direct,Lt.prototype._setValue_direct_setNeedsUpdate,Lt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Lt.prototype._setValue_array,Lt.prototype._setValue_array_setNeedsUpdate,Lt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Lt.prototype._setValue_arrayElement,Lt.prototype._setValue_arrayElement_setNeedsUpdate,Lt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Lt.prototype._setValue_fromArray,Lt.prototype._setValue_fromArray_setNeedsUpdate,Lt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var J1=new Float32Array(1);var Dd=class Dd{constructor(e,t,a,n){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,a,n)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let a=0;a<4;a++)this.elements[a]=e[a+t];return this}set(e,t,a,n){let r=this.elements;return r[0]=e,r[2]=t,r[1]=a,r[3]=n,this}};Dd.prototype.isMatrix2=!0;var ad=Dd;function Td(i,e,t,a){let n=X0(a);switch(t){case vd:return i*e;case jl:return i*e/n.components*n.byteLength;case ec:return i*e/n.components*n.byteLength;case ui:return i*e*2/n.components*n.byteLength;case tc:return i*e*2/n.components*n.byteLength;case bd:return i*e*3/n.components*n.byteLength;case Oa:return i*e*4/n.components*n.byteLength;case ac:return i*e*4/n.components*n.byteLength;case eo:case to:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ao:case no:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ic:case sc:return Math.max(i,16)*Math.max(e,8)/4;case nc:case rc:return Math.max(i,8)*Math.max(e,8)/2;case oc:case lc:case uc:case dc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case cc:case io:case fc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case hc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case pc:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case mc:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case gc:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case xc:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case _c:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case vc:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case bc:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case yc:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Sc:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case wc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Mc:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Lc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Cc:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Ic:case Tc:case Ac:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Ec:case Rc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ro:case Pc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function X0(i){switch(i){case xa:case md:return{byteLength:1,components:1};case Pr:case gd:case en:return{byteLength:2,components:1};case $l:case Ql:return{byteLength:2,components:4};case ja:case Jl:case Ba:return{byteLength:4,components:1};case xd:case _d:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"186"}}));typeof window<"u"&&(window.__THREE__?Oe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="186");function Wm(){let i=null,e=!1,t=null,a=null;function n(r,s){a=i.requestAnimationFrame(n),t(r,s)}return{start:function(){e!==!0&&t!==null&&i!==null&&(a=i.requestAnimationFrame(n),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(a),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Z0(i){let e=new WeakMap;function t(o,l){let c=o.array,u=o.usage,f=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,u),o.onUploadCallback();let h;if(c instanceof Float32Array)h=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)h=i.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?h=i.HALF_FLOAT:h=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)h=i.SHORT;else if(c instanceof Uint32Array)h=i.UNSIGNED_INT;else if(c instanceof Int32Array)h=i.INT;else if(c instanceof Int8Array)h=i.BYTE;else if(c instanceof Uint8Array)h=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)h=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:h,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function a(o,l,c){let u=l.array,f=l.updateRanges;if(i.bindBuffer(c,o),f.length===0)i.bufferSubData(c,0,u);else{f.sort((h,x)=>h.start-x.start);let d=0;for(let h=1;h<f.length;h++){let x=f[d],g=f[h];g.start<=x.start+x.count+1?x.count=Math.max(x.count,g.start+g.count-x.start):(++d,f[d]=g)}f.length=d+1;for(let h=0,x=f.length;h<x;h++){let g=f[h];i.bufferSubData(c,g.start*u.BYTES_PER_ELEMENT,u,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function n(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let l=e.get(o);l&&(i.deleteBuffer(l.buffer),e.delete(o))}function s(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");a(c.buffer,o,l),c.version=o.version}}return{get:n,remove:r,update:s}}var K0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,J0=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,$0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Q0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,j0=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,e_=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,t_=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,a_=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,n_=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,i_=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,r_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,s_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,o_=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,l_=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,c_=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,u_=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,d_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,f_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,h_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,p_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,m_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,g_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,x_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,__=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,v_=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,b_=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,y_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,S_=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,w_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,M_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,L_="gl_FragColor = linearToOutputTexel( gl_FragColor );",C_=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,I_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,T_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,A_=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,E_=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,R_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,P_=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,D_=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,F_=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,k_=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,U_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,N_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,B_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,O_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,z_=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,H_=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,V_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,G_=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,W_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,q_=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,X_=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Y_=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Z_=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,K_=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,J_=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,$_=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Q_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,j_=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ev=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,tv=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,av=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,nv=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,iv=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,rv=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,sv=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ov=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,lv=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,cv=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,uv=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,dv=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,fv=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,hv=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,pv=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,mv=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,gv=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xv=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,_v=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,vv=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,bv=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,yv=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Sv=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,wv=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Mv=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Lv=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Cv=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Iv=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Tv=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Av=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ev=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Rv=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Pv=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Dv=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Fv=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,kv=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Uv=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Nv=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Bv=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Ov=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,zv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Hv=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Vv=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Gv=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Wv=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,qv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Xv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Yv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Zv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Kv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Jv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$v=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Qv=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,jv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,eb=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,ab=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,nb=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,ib=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,rb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,sb=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ob=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,lb=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,cb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,ub=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,db=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fb=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hb=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,pb=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mb=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,gb=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,xb=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_b=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vb=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,bb=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yb=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sb=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wb=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Mb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Lb=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cb=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ib=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Tb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Qe={alphahash_fragment:K0,alphahash_pars_fragment:J0,alphamap_fragment:$0,alphamap_pars_fragment:Q0,alphatest_fragment:j0,alphatest_pars_fragment:e_,aomap_fragment:t_,aomap_pars_fragment:a_,batching_pars_vertex:n_,batching_vertex:i_,begin_vertex:r_,beginnormal_vertex:s_,bsdfs:o_,iridescence_fragment:l_,bumpmap_pars_fragment:c_,clipping_planes_fragment:u_,clipping_planes_pars_fragment:d_,clipping_planes_pars_vertex:f_,clipping_planes_vertex:h_,color_fragment:p_,color_pars_fragment:m_,color_pars_vertex:g_,color_vertex:x_,common:__,cube_uv_reflection_fragment:v_,defaultnormal_vertex:b_,displacementmap_pars_vertex:y_,displacementmap_vertex:S_,emissivemap_fragment:w_,emissivemap_pars_fragment:M_,colorspace_fragment:L_,colorspace_pars_fragment:C_,envmap_fragment:I_,envmap_common_pars_fragment:T_,envmap_pars_fragment:A_,envmap_pars_vertex:E_,envmap_physical_pars_fragment:H_,envmap_vertex:R_,fog_vertex:P_,fog_pars_vertex:D_,fog_fragment:F_,fog_pars_fragment:k_,gradientmap_pars_fragment:U_,lightmap_pars_fragment:N_,lights_lambert_fragment:B_,lights_lambert_pars_fragment:O_,lights_pars_begin:z_,lights_toon_fragment:V_,lights_toon_pars_fragment:G_,lights_phong_fragment:W_,lights_phong_pars_fragment:q_,lights_physical_fragment:X_,lights_physical_pars_fragment:Y_,lights_fragment_begin:Z_,lights_fragment_maps:K_,lights_fragment_end:J_,lightprobes_pars_fragment:$_,logdepthbuf_fragment:Q_,logdepthbuf_pars_fragment:j_,logdepthbuf_pars_vertex:ev,logdepthbuf_vertex:tv,map_fragment:av,map_pars_fragment:nv,map_particle_fragment:iv,map_particle_pars_fragment:rv,metalnessmap_fragment:sv,metalnessmap_pars_fragment:ov,morphinstance_vertex:lv,morphcolor_vertex:cv,morphnormal_vertex:uv,morphtarget_pars_vertex:dv,morphtarget_vertex:fv,normal_fragment_begin:hv,normal_fragment_maps:pv,normal_pars_fragment:mv,normal_pars_vertex:gv,normal_vertex:xv,normalmap_pars_fragment:_v,clearcoat_normal_fragment_begin:vv,clearcoat_normal_fragment_maps:bv,clearcoat_pars_fragment:yv,iridescence_pars_fragment:Sv,opaque_fragment:wv,packing:Mv,premultiplied_alpha_fragment:Lv,project_vertex:Cv,dithering_fragment:Iv,dithering_pars_fragment:Tv,roughnessmap_fragment:Av,roughnessmap_pars_fragment:Ev,shadowmap_pars_fragment:Rv,shadowmap_pars_vertex:Pv,shadowmap_vertex:Dv,shadowmask_pars_fragment:Fv,skinbase_vertex:kv,skinning_pars_vertex:Uv,skinning_vertex:Nv,skinnormal_vertex:Bv,specularmap_fragment:Ov,specularmap_pars_fragment:zv,tonemapping_fragment:Hv,tonemapping_pars_fragment:Vv,transmission_fragment:Gv,transmission_pars_fragment:Wv,uv_pars_fragment:qv,uv_pars_vertex:Xv,uv_vertex:Yv,worldpos_vertex:Zv,background_vert:Kv,background_frag:Jv,backgroundCube_vert:$v,backgroundCube_frag:Qv,cube_vert:jv,cube_frag:eb,depth_vert:tb,depth_frag:ab,distance_vert:nb,distance_frag:ib,equirect_vert:rb,equirect_frag:sb,linedashed_vert:ob,linedashed_frag:lb,meshbasic_vert:cb,meshbasic_frag:ub,meshlambert_vert:db,meshlambert_frag:fb,meshmatcap_vert:hb,meshmatcap_frag:pb,meshnormal_vert:mb,meshnormal_frag:gb,meshphong_vert:xb,meshphong_frag:_b,meshphysical_vert:vb,meshphysical_frag:bb,meshtoon_vert:yb,meshtoon_frag:Sb,points_vert:wb,points_frag:Mb,shadow_vert:Lb,shadow_frag:Cb,sprite_vert:Ib,sprite_frag:Tb},_e={common:{diffuse:{value:new Xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ye},alphaMap:{value:null},alphaMapTransform:{value:new Ye},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ye}},envmap:{envMap:{value:null},envMapRotation:{value:new Ye},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ye}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ye}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ye},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ye},normalScale:{value:new fe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ye},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ye}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ye}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ye}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new O},probesMax:{value:new O},probesResolution:{value:new O}},points:{diffuse:{value:new Xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ye},alphaTest:{value:0},uvTransform:{value:new Ye}},sprite:{diffuse:{value:new Xe(16777215)},opacity:{value:1},center:{value:new fe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ye},alphaMap:{value:null},alphaMapTransform:{value:new Ye},alphaTest:{value:0}}},wn={basic:{uniforms:ra([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.fog]),vertexShader:Qe.meshbasic_vert,fragmentShader:Qe.meshbasic_frag},lambert:{uniforms:ra([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new Xe(0)},envMapIntensity:{value:1}}]),vertexShader:Qe.meshlambert_vert,fragmentShader:Qe.meshlambert_frag},phong:{uniforms:ra([_e.common,_e.specularmap,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,_e.lights,{emissive:{value:new Xe(0)},specular:{value:new Xe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphong_vert,fragmentShader:Qe.meshphong_frag},standard:{uniforms:ra([_e.common,_e.envmap,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.roughnessmap,_e.metalnessmap,_e.fog,_e.lights,{emissive:{value:new Xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag},toon:{uniforms:ra([_e.common,_e.aomap,_e.lightmap,_e.emissivemap,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.gradientmap,_e.fog,_e.lights,{emissive:{value:new Xe(0)}}]),vertexShader:Qe.meshtoon_vert,fragmentShader:Qe.meshtoon_frag},matcap:{uniforms:ra([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,_e.fog,{matcap:{value:null}}]),vertexShader:Qe.meshmatcap_vert,fragmentShader:Qe.meshmatcap_frag},points:{uniforms:ra([_e.points,_e.fog]),vertexShader:Qe.points_vert,fragmentShader:Qe.points_frag},dashed:{uniforms:ra([_e.common,_e.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qe.linedashed_vert,fragmentShader:Qe.linedashed_frag},depth:{uniforms:ra([_e.common,_e.displacementmap]),vertexShader:Qe.depth_vert,fragmentShader:Qe.depth_frag},normal:{uniforms:ra([_e.common,_e.bumpmap,_e.normalmap,_e.displacementmap,{opacity:{value:1}}]),vertexShader:Qe.meshnormal_vert,fragmentShader:Qe.meshnormal_frag},sprite:{uniforms:ra([_e.sprite,_e.fog]),vertexShader:Qe.sprite_vert,fragmentShader:Qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ye},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qe.background_vert,fragmentShader:Qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ye}},vertexShader:Qe.backgroundCube_vert,fragmentShader:Qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qe.cube_vert,fragmentShader:Qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qe.equirect_vert,fragmentShader:Qe.equirect_frag},distance:{uniforms:ra([_e.common,_e.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qe.distance_vert,fragmentShader:Qe.distance_frag},shadow:{uniforms:ra([_e.lights,_e.fog,{color:{value:new Xe(0)},opacity:{value:1}}]),vertexShader:Qe.shadow_vert,fragmentShader:Qe.shadow_frag}};wn.physical={uniforms:ra([wn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ye},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ye},clearcoatNormalScale:{value:new fe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ye},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ye},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ye},sheen:{value:0},sheenColor:{value:new Xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ye},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ye},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ye},transmissionSamplerSize:{value:new fe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ye},attenuationDistance:{value:0},attenuationColor:{value:new Xe(0)},specularColor:{value:new Xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ye},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ye},anisotropyVector:{value:new fe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ye}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag};var kc={r:0,b:0,g:0},Ab=new xt,qm=new Ye;qm.set(-1,0,0,0,1,0,0,0,1);function Eb(i,e,t,a,n,r){let s=new Xe(0),o=n===!0?0:1,l,c,u=null,f=0,d=null;function h(y){let L=y.isScene===!0?y.background:null;if(L&&L.isTexture){let v=y.backgroundBlurriness>0;L=e.get(L,v)}return L}function x(y){let L=!1,v=h(y);v===null?p(s,o):v&&v.isColor&&(p(v,1),L=!0);let S=i.xr.getEnvironmentBlendMode();S==="additive"?t.buffers.color.setClear(0,0,0,1,r):S==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||L)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function g(y,L){let v=h(L);v&&(v.isCubeTexture||v.mapping===Qs)?(c===void 0&&(c=new nt(new _n(1,1,1),new Ia({name:"BackgroundCubeMaterial",uniforms:Ui(wn.backgroundCube.uniforms),vertexShader:wn.backgroundCube.vertexShader,fragmentShader:wn.backgroundCube.fragmentShader,side:Kt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(S,w,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),a.update(c)),c.material.uniforms.envMap.value=v,c.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Ab.makeRotationFromEuler(L.backgroundRotation)).transpose(),v.isCubeTexture&&v.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(qm),c.material.toneMapped=rt.getTransfer(v.colorSpace)!==ht,(u!==v||f!==v.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,u=v,f=v.version,d=i.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new nt(new ia(2,2),new Ia({name:"BackgroundMaterial",uniforms:Ui(wn.background.uniforms),vertexShader:wn.background.vertexShader,fragmentShader:wn.background.fragmentShader,side:oi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),a.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,l.material.toneMapped=rt.getTransfer(v.colorSpace)!==ht,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(u!==v||f!==v.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,u=v,f=v.version,d=i.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,L){y.getRGB(kc,Ld(i)),t.buffers.color.setClear(kc.r,kc.g,kc.b,L,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return s},setClearColor:function(y,L=1){s.set(y),o=L,p(s,o)},getClearAlpha:function(){return o},setClearAlpha:function(y){o=y,p(s,o)},render:x,addToRenderList:g,dispose:m}}function Rb(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),a={},n=d(null),r=n,s=!1;function o(E,F,U,R,B){let q=!1,H=f(E,R,U,F);r!==H&&(r=H,c(r.object)),q=h(E,R,U,B),q&&x(E,R,U,B),B!==null&&e.update(B,i.ELEMENT_ARRAY_BUFFER),(q||s)&&(s=!1,v(E,F,U,R),B!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function l(){return i.createVertexArray()}function c(E){return i.bindVertexArray(E)}function u(E){return i.deleteVertexArray(E)}function f(E,F,U,R){let B=R.wireframe===!0,q=a[F.id];q===void 0&&(q={},a[F.id]=q);let H=E.isInstancedMesh===!0?E.id:0,te=q[H];te===void 0&&(te={},q[H]=te);let Y=te[U.id];Y===void 0&&(Y={},te[U.id]=Y);let $=Y[B];return $===void 0&&($=d(l()),Y[B]=$),$}function d(E){let F=[],U=[],R=[];for(let B=0;B<t;B++)F[B]=0,U[B]=0,R[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:U,attributeDivisors:R,object:E,attributes:{},index:null}}function h(E,F,U,R){let B=r.attributes,q=F.attributes,H=0,te=U.getAttributes();for(let Y in te)if(te[Y].location>=0){let j=B[Y],Ce=q[Y];if(Ce===void 0&&(Y==="instanceMatrix"&&E.instanceMatrix&&(Ce=E.instanceMatrix),Y==="instanceColor"&&E.instanceColor&&(Ce=E.instanceColor)),j===void 0||j.attribute!==Ce||Ce&&j.data!==Ce.data)return!0;H++}return r.attributesNum!==H||r.index!==R}function x(E,F,U,R){let B={},q=F.attributes,H=0,te=U.getAttributes();for(let Y in te)if(te[Y].location>=0){let j=q[Y];j===void 0&&(Y==="instanceMatrix"&&E.instanceMatrix&&(j=E.instanceMatrix),Y==="instanceColor"&&E.instanceColor&&(j=E.instanceColor));let Ce={};Ce.attribute=j,j&&j.data&&(Ce.data=j.data),B[Y]=Ce,H++}r.attributes=B,r.attributesNum=H,r.index=R}function g(){let E=r.newAttributes;for(let F=0,U=E.length;F<U;F++)E[F]=0}function p(E){m(E,0)}function m(E,F){let U=r.newAttributes,R=r.enabledAttributes,B=r.attributeDivisors;U[E]=1,R[E]===0&&(i.enableVertexAttribArray(E),R[E]=1),B[E]!==F&&(i.vertexAttribDivisor(E,F),B[E]=F)}function y(){let E=r.newAttributes,F=r.enabledAttributes;for(let U=0,R=F.length;U<R;U++)F[U]!==E[U]&&(i.disableVertexAttribArray(U),F[U]=0)}function L(E,F,U,R,B,q,H){H===!0?i.vertexAttribIPointer(E,F,U,B,q):i.vertexAttribPointer(E,F,U,R,B,q)}function v(E,F,U,R){g();let B=R.attributes,q=U.getAttributes(),H=F.defaultAttributeValues;for(let te in q){let Y=q[te];if(Y.location>=0){let $=B[te];if($===void 0&&(te==="instanceMatrix"&&E.instanceMatrix&&($=E.instanceMatrix),te==="instanceColor"&&E.instanceColor&&($=E.instanceColor)),$!==void 0){let j=$.normalized,Ce=$.itemSize,Me=e.get($);if(Me===void 0)continue;let Je=Me.buffer,qe=Me.type,ot=Me.bytesPerElement,J=qe===i.INT||qe===i.UNSIGNED_INT||$.gpuType===Jl;if($.isInterleavedBufferAttribute){let ae=$.data,ve=ae.stride,ze=$.offset;if(ae.isInstancedInterleavedBuffer){for(let we=0;we<Y.locationSize;we++)m(Y.location+we,ae.meshPerAttribute);E.isInstancedMesh!==!0&&R._maxInstanceCount===void 0&&(R._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let we=0;we<Y.locationSize;we++)p(Y.location+we);i.bindBuffer(i.ARRAY_BUFFER,Je);for(let we=0;we<Y.locationSize;we++)L(Y.location+we,Ce/Y.locationSize,qe,j,ve*ot,(ze+Ce/Y.locationSize*we)*ot,J)}else{if($.isInstancedBufferAttribute){for(let ae=0;ae<Y.locationSize;ae++)m(Y.location+ae,$.meshPerAttribute);E.isInstancedMesh!==!0&&R._maxInstanceCount===void 0&&(R._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let ae=0;ae<Y.locationSize;ae++)p(Y.location+ae);i.bindBuffer(i.ARRAY_BUFFER,Je);for(let ae=0;ae<Y.locationSize;ae++)L(Y.location+ae,Ce/Y.locationSize,qe,j,Ce*ot,Ce/Y.locationSize*ae*ot,J)}}else if(H!==void 0){let j=H[te];if(j!==void 0)switch(j.length){case 2:i.vertexAttrib2fv(Y.location,j);break;case 3:i.vertexAttrib3fv(Y.location,j);break;case 4:i.vertexAttrib4fv(Y.location,j);break;default:i.vertexAttrib1fv(Y.location,j)}}}}y()}function S(){C();for(let E in a){let F=a[E];for(let U in F){let R=F[U];for(let B in R){let q=R[B];for(let H in q)u(q[H].object),delete q[H];delete R[B]}}delete a[E]}}function w(E){if(a[E.id]===void 0)return;let F=a[E.id];for(let U in F){let R=F[U];for(let B in R){let q=R[B];for(let H in q)u(q[H].object),delete q[H];delete R[B]}}delete a[E.id]}function I(E){for(let F in a){let U=a[F];for(let R in U){let B=U[R];if(B[E.id]===void 0)continue;let q=B[E.id];for(let H in q)u(q[H].object),delete q[H];delete B[E.id]}}}function _(E){for(let F in a){let U=a[F],R=E.isInstancedMesh===!0?E.id:0,B=U[R];if(B!==void 0){for(let q in B){let H=B[q];for(let te in H)u(H[te].object),delete H[te];delete B[q]}delete U[R],Object.keys(U).length===0&&delete a[F]}}}function C(){A(),s=!0,r!==n&&(r=n,c(r.object))}function A(){n.geometry=null,n.program=null,n.wireframe=!1}return{setup:o,reset:C,resetDefaultState:A,dispose:S,releaseStatesOfGeometry:w,releaseStatesOfObject:_,releaseStatesOfProgram:I,initAttributes:g,enableAttribute:p,disableUnusedAttributes:y}}function Pb(i,e,t){let a;function n(l){a=l}function r(l,c){i.drawArrays(a,l,c),t.update(c,a,1)}function s(l,c,u){u!==0&&(i.drawArraysInstanced(a,l,c,u),t.update(c,a,u))}function o(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(a,l,0,c,0,u);let d=0;for(let h=0;h<u;h++)d+=c[h];t.update(d,a,1)}this.setMode=n,this.render=r,this.renderInstances=s,this.renderMultiDraw=o}function Db(i,e,t,a){let n;function r(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){let I=e.get("EXT_texture_filter_anisotropic");n=i.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function s(I){return!(I!==Oa&&a.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(I){let _=I===en&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(I!==xa&&I!==Ba&&!_&&a.convert(I)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(I){if(I==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";I="mediump"}return I==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(Oe("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let f=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&d===!1&&Oe("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let h=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),y=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),L=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),S=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:s,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:h,maxVertexTextures:x,maxTextureSize:g,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:y,maxVaryings:L,maxFragmentUniforms:v,maxSamples:S,samples:w}}function Fb(i){let e=this,t=null,a=0,n=!1,r=!1,s=new Ja,o=new Ye,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){let h=f.length!==0||d||a!==0||n;return n=d,a=f.length,h},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,d){t=u(f,d,0)},this.setState=function(f,d,h){let x=f.clippingPlanes,g=f.clipIntersection,p=f.clipShadows,m=i.get(f);if(!n||x===null||x.length===0||r&&!p)r?u(null):c();else{let y=r?0:a,L=y*4,v=m.clippingState||null;l.value=v,v=u(x,d,L,h);for(let S=0;S!==L;++S)v[S]=t[S];m.clippingState=v,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=y}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=a>0),e.numPlanes=a,e.numIntersection=0}function u(f,d,h,x){let g=f!==null?f.length:0,p=null;if(g!==0){if(p=l.value,x!==!0||p===null){let m=h+g*4,y=d.matrixWorldInverse;o.getNormalMatrix(y),(p===null||p.length<m)&&(p=new Float32Array(m));for(let L=0,v=h;L!==g;++L,v+=4)s.copy(f[L]).applyMatrix4(y,o),s.normal.toArray(p,v),p[v+3]=s.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=g,e.numIntersection=0,p}}var Ur=4,kb=6,Ub=20,Nb=256,oo=new Ar,wm=new Xe,Fd=null,kd=0,Ud=0,Nd=!1,Bb=new O,Ni=new O,Br=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,a=.1,n=100,r={}){let{size:s=256,position:o=Bb}=r;Fd=this._renderer.getRenderTarget(),kd=this._renderer.getActiveCubeFace(),Ud=this._renderer.getActiveMipmapLevel(),Nd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(s);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,a,n,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Cm(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Lm(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Fd,kd,Ud),this._renderer.xr.enabled=Nd,e.scissorTest=!1,kr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===li||e.mapping===Fi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Fd=this._renderer.getRenderTarget(),kd=this._renderer.getActiveCubeFace(),Ud=this._renderer.getActiveMipmapLevel(),Nd=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let a=t||this._allocateTargets();return this._textureToCubeUV(e,a),this._applyPMREM(a),this._cleanup(a),a}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,a={magFilter:Ht,minFilter:Ht,generateMipmaps:!1,type:en,format:Oa,colorSpace:_s,depthBuffer:!1},n=Mm(e,t,a);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Mm(e,t,a);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Ob(r)),this._blurMaterial=Hb(r,e,t),this._ggxMaterial=zb(r,e,t)}return n}_compileMaterial(e){let t=new nt(new aa,e);this._renderer.compile(t,oo)}_sceneToCubeUV(e,t,a,n,r){let l=new zt(90,1,t,a),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,d=f.autoClear,h=f.toneMapping;f.getClearColor(wm),f.toneMapping=Qa,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(n),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new nt(new _n,new na({name:"PMREM.Background",side:Kt,depthWrite:!1,depthTest:!1})));let g=this._backgroundBox,p=g.material,m=!1,y=e.background;y?y.isColor&&(p.color.copy(y),e.background=null,m=!0):(p.color.copy(wm),m=!0);for(let L=0;L<6;L++){let v=L%3;v===0?(l.up.set(0,c[L],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[L],r.y,r.z)):v===1?(l.up.set(0,0,c[L]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[L],r.z)):(l.up.set(0,c[L],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[L]));let S=this._cubeSize;kr(n,v*S,L>2?S:0,S,S),f.setRenderTarget(n),m&&f.render(g,l),f.render(e,l)}f.toneMapping=h,f.autoClear=d,e.background=y}_textureToCubeUV(e,t){let a=this._renderer,n=e.mapping===li||e.mapping===Fi;n?(this._cubemapMaterial===null&&(this._cubemapMaterial=Cm()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Lm());let r=n?this._cubemapMaterial:this._equirectMaterial,s=this._lodMeshes[0];s.material=r;let o=r.uniforms;o.envMap.value=e;let l=this._cubeSize;kr(t,0,0,3*l,2*l),a.setRenderTarget(t),a.render(s,oo)}_applyPMREM(e){let t=this._renderer,a=t.autoClear;t.autoClear=!1;let n=this._lodMeshes.length;for(let r=1;r<n;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=a}_applyGGXFilter(e,t,a){let n=this._renderer,r=this._pingPongRenderTarget,s=this._ggxMaterial,o=this._lodMeshes[a];o.material=s;let l=s.uniforms,c=a/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),f=Math.sqrt(c*c-u*u),d=c*1.25,h=f*d,{_lodMax:x}=this,g=this._sizeLods[a],p=3*g*(a>x-Ur?a-x+Ur:0),m=4*(this._cubeSize-g);l.envMap.value=e.texture,l.roughness.value=h,l.mipInt.value=x-t,kr(r,p,m,3*g,2*g),n.setRenderTarget(r),n.render(o,oo),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=x-a,kr(e,p,m,3*g,2*g),n.setRenderTarget(e),n.render(o,oo)}_blur(e,t,a,n){let r=this._pingPongRenderTarget,s=Math.min(n,Math.PI)/Math.SQRT2;this._blurPass(e,r,t,a,s),this._blurPass(r,e,a,a,s)}_blurPass(e,t,a,n,r){let s=this._renderer,o=this._blurMaterial,l=this._lodMeshes[n];l.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-a;let u=this._sizeLods[n],f=3*u*(n>this._lodMax-Ur?n-this._lodMax+Ur:0),d=4*(this._cubeSize-u);kr(t,f,d,3*u,2*u),s.setRenderTarget(t),s.render(l,oo)}};function Ob(i){let e=[],t=[],a=i,n=i-Ur+1+kb;for(let r=0;r<n;r++){let s=Math.pow(2,a);e.push(s);let o=1/(s-2),l=-o,c=1+o,u=[l,l,c,l,c,c,l,l,c,c,l,c],f=6,d=6,h=3,x=new Float32Array(h*d*f),g=new Float32Array(h*d*f);for(let m=0;m<f;m++){let y=m%3*2/3-1,L=m>2?0:-1,v=[y,L,0,y+2/3,L,0,y+2/3,L+1,0,y,L,0,y+2/3,L+1,0,y,L+1,0];x.set(v,h*d*m);for(let S=0;S<d;S++){let w=u[S*2]*2-1,I=u[S*2+1]*2-1;m===0?Ni.set(1,I,w):m===1?Ni.set(-w,1,-I):m===2?Ni.set(-w,I,1):m===3?Ni.set(-1,I,-w):m===4?Ni.set(-w,-1,I):Ni.set(w,I,-1),Ni.toArray(g,(m*d+S)*h)}}let p=new aa;p.setAttribute("position",new fa(x,h)),p.setAttribute("outputDirection",new fa(g,h)),t.push(new nt(p,null)),a>Ur&&a--}return{lodMeshes:t,sizeLods:e}}function Mm(i,e,t){let a=new ga(i,e,t);return a.texture.mapping=Qs,a.texture.name="PMREM.cubeUv",a.scissorTest=!0,a}function kr(i,e,t,a,n){i.viewport.set(e,t,a,n),i.scissor.set(e,t,a,n)}function zb(i,e,t){return new Ia({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Nb,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Oc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:bn,depthTest:!1,depthWrite:!1})}function Hb(i,e,t){return new Ia({name:"SphericalGaussianBlur",defines:{SAMPLES:Ub,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Oc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:bn,depthTest:!1,depthWrite:!1})}function Lm(){return new Ia({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Oc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:bn,depthTest:!1,depthWrite:!1})}function Cm(){return new Ia({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Oc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:bn,depthTest:!1,depthWrite:!1})}function Oc(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Nc=class extends ga{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let a={width:e,height:e,depth:1},n=[a,a,a,a,a,a];this.texture=new Rs(n),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let a={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},n=new _n(5,5,5),r=new Ia({name:"CubemapFromEquirect",uniforms:Ui(a.uniforms),vertexShader:a.vertexShader,fragmentShader:a.fragmentShader,side:Kt,blending:bn});r.uniforms.tEquirect.value=t;let s=new nt(n,r),o=t.minFilter;return t.minFilter===yn&&(t.minFilter=Ht),new Gl(1,10,this).update(e,s),t.minFilter=o,s.geometry.dispose(),s.material.dispose(),this}clear(e,t=!0,a=!0,n=!0){let r=e.getRenderTarget();for(let s=0;s<6;s++)e.setRenderTarget(this,s),e.clear(t,a,n);e.setRenderTarget(r)}};function Vb(i){let e=new WeakMap,t=new WeakMap,a=null;function n(d,h=!1){return d==null?null:h?s(d):r(d)}function r(d){if(d&&d.isTexture){let h=d.mapping;if(h===Yl||h===Zl)if(e.has(d)){let x=e.get(d).texture;return o(x,d.mapping)}else{let x=d.image;if(x&&x.height>0){let g=new Nc(x.height);return g.fromEquirectangularTexture(i,d),e.set(d,g),d.addEventListener("dispose",c),o(g.texture,d.mapping)}else return null}}return d}function s(d){if(d&&d.isTexture){let h=d.mapping,x=h===Yl||h===Zl,g=h===li||h===Fi;if(x||g){let p=t.get(d),m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return a===null&&(a=new Br(i)),p=x?a.fromEquirectangular(d,p):a.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),p.texture;if(p!==void 0)return p.texture;{let y=d.image;return x&&y&&y.height>0||g&&y&&l(y)?(a===null&&(a=new Br(i)),p=x?a.fromEquirectangular(d):a.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),d.addEventListener("dispose",u),p.texture):null}}}return d}function o(d,h){return h===Yl?d.mapping=li:h===Zl&&(d.mapping=Fi),d}function l(d){let h=0,x=6;for(let g=0;g<x;g++)d[g]!==void 0&&h++;return h===x}function c(d){let h=d.target;h.removeEventListener("dispose",c);let x=e.get(h);x!==void 0&&(e.delete(h),x.dispose())}function u(d){let h=d.target;h.removeEventListener("dispose",u);let x=t.get(h);x!==void 0&&(t.delete(h),x.dispose())}function f(){e=new WeakMap,t=new WeakMap,a!==null&&(a.dispose(),a=null)}return{get:n,dispose:f}}function Gb(i){let e={};function t(a){if(e[a]!==void 0)return e[a];let n=i.getExtension(a);return e[a]=n,n}return{has:function(a){return t(a)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(a){let n=t(a);return n===null&&Ai("WebGLRenderer: "+a+" extension not supported."),n}}}function Wb(i,e,t,a){let n={},r=new WeakMap;function s(f){let d=f.target;d.index!==null&&e.remove(d.index);for(let x in d.attributes)e.remove(d.attributes[x]);d.removeEventListener("dispose",s),delete n[d.id];let h=r.get(d);h&&(e.remove(h),r.delete(d)),a.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(f,d){return n[d.id]===!0||(d.addEventListener("dispose",s),n[d.id]=!0,t.memory.geometries++),d}function l(f){let d=f.attributes;for(let h in d)e.update(d[h],i.ARRAY_BUFFER)}function c(f){let d=[],h=f.index,x=f.attributes.position,g=0;if(x===void 0)return;if(h!==null){let y=h.array;g=h.version;for(let L=0,v=y.length;L<v;L+=3){let S=y[L+0],w=y[L+1],I=y[L+2];d.push(S,w,w,I,I,S)}}else{let y=x.array;g=x.version;for(let L=0,v=y.length/3-1;L<v;L+=3){let S=L+0,w=L+1,I=L+2;d.push(S,w,w,I,I,S)}}let p=new(x.count>=65535?Ls:Ms)(d,1);p.version=g;let m=r.get(f);m&&e.remove(m),r.set(f,p)}function u(f){let d=r.get(f);if(d){let h=f.index;h!==null&&d.version<h.version&&c(f)}else c(f);return r.get(f)}return{get:o,update:l,getWireframeAttribute:u}}function qb(i,e,t){let a;function n(f){a=f}let r,s;function o(f){r=f.type,s=f.bytesPerElement}function l(f,d){i.drawElements(a,d,r,f*s),t.update(d,a,1)}function c(f,d,h){h!==0&&(i.drawElementsInstanced(a,d,r,f*s,h),t.update(d,a,h))}function u(f,d,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(a,d,0,r,f,0,h);let g=0;for(let p=0;p<h;p++)g+=d[p];t.update(g,a,1)}this.setMode=n,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function Xb(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function a(r,s,o){switch(t.calls++,s){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:He("WebGLInfo: Unknown draw mode:",s);break}}function n(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:n,update:a}}function Yb(i,e,t){let a=new WeakMap,n=new Ct;function r(s,o,l){let c=s.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=u!==void 0?u.length:0,d=a.get(o);if(d===void 0||d.count!==f){let C=function(){I.dispose(),a.delete(o),o.removeEventListener("dispose",C)};d!==void 0&&d.texture.dispose();let h=o.morphAttributes.position!==void 0,x=o.morphAttributes.normal!==void 0,g=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],y=o.morphAttributes.color||[],L=0;h===!0&&(L=1),x===!0&&(L=2),g===!0&&(L=3);let v=o.attributes.position.count*L,S=1;v>e.maxTextureSize&&(S=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);let w=new Float32Array(v*S*4*f),I=new ys(w,v,S,f);I.type=Ba,I.needsUpdate=!0;let _=L*4;for(let A=0;A<f;A++){let E=p[A],F=m[A],U=y[A],R=v*S*4*A;for(let B=0;B<E.count;B++){let q=B*_;h===!0&&(n.fromBufferAttribute(E,B),w[R+q+0]=n.x,w[R+q+1]=n.y,w[R+q+2]=n.z,w[R+q+3]=0),x===!0&&(n.fromBufferAttribute(F,B),w[R+q+4]=n.x,w[R+q+5]=n.y,w[R+q+6]=n.z,w[R+q+7]=0),g===!0&&(n.fromBufferAttribute(U,B),w[R+q+8]=n.x,w[R+q+9]=n.y,w[R+q+10]=n.z,w[R+q+11]=U.itemSize===4?n.w:1)}}d={count:f,texture:I,size:new fe(v,S)},a.set(o,d),o.addEventListener("dispose",C)}if(s.isInstancedMesh===!0&&s.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",s.morphTexture,t);else{let h=0;for(let g=0;g<c.length;g++)h+=c[g];let x=o.morphTargetsRelative?1:1-h;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function Zb(i,e,t,a,n){let r=new WeakMap;function s(c){let u=n.render.frame,f=c.geometry,d=e.get(c,f);if(r.get(d)!==u&&(e.update(d),r.set(d,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==u&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,u))),c.isSkinnedMesh){let h=c.skeleton;r.get(h)!==u&&(h.update(),r.set(h,u))}return d}function o(){r=new WeakMap}function l(c){let u=c.target;u.removeEventListener("dispose",l),a.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:s,dispose:o}}var Kb={[ld]:"LINEAR_TONE_MAPPING",[cd]:"REINHARD_TONE_MAPPING",[ud]:"CINEON_TONE_MAPPING",[$s]:"ACES_FILMIC_TONE_MAPPING",[fd]:"AGX_TONE_MAPPING",[hd]:"NEUTRAL_TONE_MAPPING",[dd]:"CUSTOM_TONE_MAPPING"};function Jb(i,e,t,a,n,r){let s=new ga(e,t,{type:i,depthBuffer:n,stencilBuffer:r,samples:a?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),o=null,l=null,c=new aa;c.setAttribute("position",new Bt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new Bt([0,2,0,0,2,0],2));let u=new El({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new nt(c,u),d=new Ar(-1,1,1,-1,0,1),h=null,x=null,g=!1,p,m=null,y=[],L=!1;this.setSize=function(v,S){s.setSize(v,S),o!==null&&o.setSize(v,S),l!==null&&l.setSize(v,S);for(let w=0;w<y.length;w++){let I=y[w];I.setSize&&I.setSize(v,S)}},this.setEffects=function(v){y=v,L=y.length>0&&y[0].isRenderPass===!0;let S=s.width,w=s.height;y.length>0&&o===null&&(o=new ga(S,w,{type:en,depthBuffer:!1,stencilBuffer:!1}),l=new ga(S,w,{type:en,depthBuffer:!1,stencilBuffer:!1}));for(let I=0;I<y.length;I++){let _=y[I];_.setSize&&_.setSize(S,w)}},this.begin=function(v,S){if(g||v.toneMapping===Qa&&y.length===0)return!1;if(m=S,S!==null){let w=S.width,I=S.height;(s.width!==w||s.height!==I)&&this.setSize(w,I)}return L===!1&&v.setRenderTarget(s),p=v.toneMapping,v.toneMapping=Qa,!0},this.hasRenderPass=function(){return L},this.end=function(v,S){v.toneMapping=p,g=!0;let w=s,I=o;for(let _=0;_<y.length;_++){let C=y[_];C.enabled!==!1&&(C.render(v,I,w,S),C.needsSwap!==!1&&(w=I,I=I===o?l:o))}if(h!==v.outputColorSpace||x!==v.toneMapping){h=v.outputColorSpace,x=v.toneMapping,u.defines={},rt.getTransfer(h)===ht&&(u.defines.SRGB_TRANSFER="");let _=Kb[x];_&&(u.defines[_]=""),u.needsUpdate=!0}u.uniforms.tDiffuse.value=w.texture,v.setRenderTarget(m),v.render(f,d),m=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){s.dispose(),o!==null&&o.dispose(),l!==null&&l.dispose(),c.dispose(),u.dispose()}}var Xm=new ha,zd=new ai(1,1),Ym=new ys,Zm=new Sl,Km=new Rs,Im=[],Tm=[],Am=new Float32Array(16),Em=new Float32Array(9),Rm=new Float32Array(4);function Or(i,e,t){let a=i[0];if(a<=0||a>0)return i;let n=e*t,r=Im[n];if(r===void 0&&(r=new Float32Array(n),Im[n]=r),e!==0){a.toArray(r,0);for(let s=1,o=0;s!==e;++s)o+=t,i[s].toArray(r,o)}return r}function Vt(i,e){if(i.length!==e.length)return!1;for(let t=0,a=i.length;t<a;t++)if(i[t]!==e[t])return!1;return!0}function Gt(i,e){for(let t=0,a=e.length;t<a;t++)i[t]=e[t]}function zc(i,e){let t=Tm[e];t===void 0&&(t=new Int32Array(e),Tm[e]=t);for(let a=0;a!==e;++a)t[a]=i.allocateTextureUnit();return t}function $b(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Qb(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Vt(t,e))return;i.uniform2fv(this.addr,e),Gt(t,e)}}function jb(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Vt(t,e))return;i.uniform3fv(this.addr,e),Gt(t,e)}}function ey(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Vt(t,e))return;i.uniform4fv(this.addr,e),Gt(t,e)}}function ty(i,e){let t=this.cache,a=e.elements;if(a===void 0){if(Vt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Gt(t,e)}else{if(Vt(t,a))return;Rm.set(a),i.uniformMatrix2fv(this.addr,!1,Rm),Gt(t,a)}}function ay(i,e){let t=this.cache,a=e.elements;if(a===void 0){if(Vt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Gt(t,e)}else{if(Vt(t,a))return;Em.set(a),i.uniformMatrix3fv(this.addr,!1,Em),Gt(t,a)}}function ny(i,e){let t=this.cache,a=e.elements;if(a===void 0){if(Vt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Gt(t,e)}else{if(Vt(t,a))return;Am.set(a),i.uniformMatrix4fv(this.addr,!1,Am),Gt(t,a)}}function iy(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function ry(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Vt(t,e))return;i.uniform2iv(this.addr,e),Gt(t,e)}}function sy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Vt(t,e))return;i.uniform3iv(this.addr,e),Gt(t,e)}}function oy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Vt(t,e))return;i.uniform4iv(this.addr,e),Gt(t,e)}}function ly(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function cy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Vt(t,e))return;i.uniform2uiv(this.addr,e),Gt(t,e)}}function uy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Vt(t,e))return;i.uniform3uiv(this.addr,e),Gt(t,e)}}function dy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Vt(t,e))return;i.uniform4uiv(this.addr,e),Gt(t,e)}}function fy(i,e,t){let a=this.cache,n=t.allocateTextureUnit();a[0]!==n&&(i.uniform1i(this.addr,n),a[0]=n);let r;this.type===i.SAMPLER_2D_SHADOW?(zd.compareFunction=t.isReversedDepthBuffer()?Fc:Dc,r=zd):r=Xm,t.setTexture2D(e||r,n)}function hy(i,e,t){let a=this.cache,n=t.allocateTextureUnit();a[0]!==n&&(i.uniform1i(this.addr,n),a[0]=n),t.setTexture3D(e||Zm,n)}function py(i,e,t){let a=this.cache,n=t.allocateTextureUnit();a[0]!==n&&(i.uniform1i(this.addr,n),a[0]=n),t.setTextureCube(e||Km,n)}function my(i,e,t){let a=this.cache,n=t.allocateTextureUnit();a[0]!==n&&(i.uniform1i(this.addr,n),a[0]=n),t.setTexture2DArray(e||Ym,n)}function gy(i){switch(i){case 5126:return $b;case 35664:return Qb;case 35665:return jb;case 35666:return ey;case 35674:return ty;case 35675:return ay;case 35676:return ny;case 5124:case 35670:return iy;case 35667:case 35671:return ry;case 35668:case 35672:return sy;case 35669:case 35673:return oy;case 5125:return ly;case 36294:return cy;case 36295:return uy;case 36296:return dy;case 35678:case 36198:case 36298:case 36306:case 35682:return fy;case 35679:case 36299:case 36307:return hy;case 35680:case 36300:case 36308:case 36293:return py;case 36289:case 36303:case 36311:case 36292:return my}}function xy(i,e){i.uniform1fv(this.addr,e)}function _y(i,e){let t=Or(e,this.size,2);i.uniform2fv(this.addr,t)}function vy(i,e){let t=Or(e,this.size,3);i.uniform3fv(this.addr,t)}function by(i,e){let t=Or(e,this.size,4);i.uniform4fv(this.addr,t)}function yy(i,e){let t=Or(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Sy(i,e){let t=Or(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function wy(i,e){let t=Or(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function My(i,e){i.uniform1iv(this.addr,e)}function Ly(i,e){i.uniform2iv(this.addr,e)}function Cy(i,e){i.uniform3iv(this.addr,e)}function Iy(i,e){i.uniform4iv(this.addr,e)}function Ty(i,e){i.uniform1uiv(this.addr,e)}function Ay(i,e){i.uniform2uiv(this.addr,e)}function Ey(i,e){i.uniform3uiv(this.addr,e)}function Ry(i,e){i.uniform4uiv(this.addr,e)}function Py(i,e,t){let a=this.cache,n=e.length,r=zc(t,n);Vt(a,r)||(i.uniform1iv(this.addr,r),Gt(a,r));let s;this.type===i.SAMPLER_2D_SHADOW?s=zd:s=Xm;for(let o=0;o!==n;++o)t.setTexture2D(e[o]||s,r[o])}function Dy(i,e,t){let a=this.cache,n=e.length,r=zc(t,n);Vt(a,r)||(i.uniform1iv(this.addr,r),Gt(a,r));for(let s=0;s!==n;++s)t.setTexture3D(e[s]||Zm,r[s])}function Fy(i,e,t){let a=this.cache,n=e.length,r=zc(t,n);Vt(a,r)||(i.uniform1iv(this.addr,r),Gt(a,r));for(let s=0;s!==n;++s)t.setTextureCube(e[s]||Km,r[s])}function ky(i,e,t){let a=this.cache,n=e.length,r=zc(t,n);Vt(a,r)||(i.uniform1iv(this.addr,r),Gt(a,r));for(let s=0;s!==n;++s)t.setTexture2DArray(e[s]||Ym,r[s])}function Uy(i){switch(i){case 5126:return xy;case 35664:return _y;case 35665:return vy;case 35666:return by;case 35674:return yy;case 35675:return Sy;case 35676:return wy;case 5124:case 35670:return My;case 35667:case 35671:return Ly;case 35668:case 35672:return Cy;case 35669:case 35673:return Iy;case 5125:return Ty;case 36294:return Ay;case 36295:return Ey;case 36296:return Ry;case 35678:case 36198:case 36298:case 36306:case 35682:return Py;case 35679:case 36299:case 36307:return Dy;case 35680:case 36300:case 36308:case 36293:return Fy;case 36289:case 36303:case 36311:case 36292:return ky}}var Hd=class{constructor(e,t,a){this.id=e,this.addr=a,this.cache=[],this.type=t.type,this.setValue=gy(t.type)}},Vd=class{constructor(e,t,a){this.id=e,this.addr=a,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Uy(t.type)}},Gd=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,a){let n=this.seq;for(let r=0,s=n.length;r!==s;++r){let o=n[r];o.setValue(e,t[o.id],a)}}},Bd=/(\w+)(\])?(\[|\.)?/g;function Pm(i,e){i.seq.push(e),i.map[e.id]=e}function Ny(i,e,t){let a=i.name,n=a.length;for(Bd.lastIndex=0;;){let r=Bd.exec(a),s=Bd.lastIndex,o=r[1],l=r[2]==="]",c=r[3];if(l&&(o=o|0),c===void 0||c==="["&&s+2===n){Pm(t,c===void 0?new Hd(o,i,e):new Vd(o,i,e));break}else{let f=t.map[o];f===void 0&&(f=new Gd(o),Pm(t,f)),t=f}}}var Nr=class{constructor(e,t){this.seq=[],this.map={};let a=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<a;++s){let o=e.getActiveUniform(t,s),l=e.getUniformLocation(t,o.name);Ny(o,l,this)}let n=[],r=[];for(let s of this.seq)s.type===e.SAMPLER_2D_SHADOW||s.type===e.SAMPLER_CUBE_SHADOW||s.type===e.SAMPLER_2D_ARRAY_SHADOW?n.push(s):r.push(s);n.length>0&&(this.seq=n.concat(r))}setValue(e,t,a,n){let r=this.map[t];r!==void 0&&r.setValue(e,a,n)}setOptional(e,t,a){let n=t[a];n!==void 0&&this.setValue(e,a,n)}static upload(e,t,a,n){for(let r=0,s=t.length;r!==s;++r){let o=t[r],l=a[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,n)}}static seqWithValue(e,t){let a=[];for(let n=0,r=e.length;n!==r;++n){let s=e[n];s.id in t&&a.push(s)}return a}};function Dm(i,e,t){let a=i.createShader(e);return i.shaderSource(a,t),i.compileShader(a),a}var By=37297,Oy=0;function zy(i,e){let t=i.split(`
`),a=[],n=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let s=n;s<r;s++){let o=s+1;a.push(`${o===e?">":" "} ${o}: ${t[s]}`)}return a.join(`
`)}var Fm=new Ye;function Hy(i){rt._getMatrix(Fm,rt.workingColorSpace,i);let e=`mat3( ${Fm.elements.map(t=>t.toFixed(4))} )`;switch(rt.getTransfer(i)){case vs:return[e,"LinearTransferOETF"];case ht:return[e,"sRGBTransferOETF"];default:return Oe("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function km(i,e,t){let a=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(a&&r==="")return"";let s=/ERROR: 0:(\d+)/.exec(r);if(s){let o=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+zy(i.getShaderSource(e),o)}else return r}function Vy(i,e){let t=Hy(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var Gy={[ld]:"Linear",[cd]:"Reinhard",[ud]:"Cineon",[$s]:"ACESFilmic",[fd]:"AgX",[hd]:"Neutral",[dd]:"Custom"};function Wy(i,e){let t=Gy[e];return t===void 0?(Oe("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Uc=new O;function qy(){rt.getLuminanceCoefficients(Uc);let i=Uc.x.toFixed(4),e=Uc.y.toFixed(4),t=Uc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Xy(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(co).join(`
`)}function Yy(i){let e=[];for(let t in i){let a=i[t];a!==!1&&e.push("#define "+t+" "+a)}return e.join(`
`)}function Zy(i,e){let t={},a=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let n=0;n<a;n++){let r=i.getActiveAttrib(e,n),s=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[s]={type:r.type,location:i.getAttribLocation(e,s),locationSize:o}}return t}function co(i){return i!==""}function Um(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Nm(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Ky=/^[ \t]*#include +<([\w\d./]+)>/gm;function Wd(i){return i.replace(Ky,$y)}var Jy=new Map;function $y(i,e){let t=Qe[e];if(t===void 0){let a=Jy.get(e);if(a!==void 0)t=Qe[a],Oe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,a);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return Wd(t)}var Qy=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Bm(i){return i.replace(Qy,jy)}function jy(i,e,t,a){let n="";for(let r=parseInt(e);r<parseInt(t);r++)n+=a.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return n}function Om(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var eS={[Ks]:"SHADOWMAP_TYPE_PCF",[Er]:"SHADOWMAP_TYPE_VSM"};function tS(i){return eS[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var aS={[li]:"ENVMAP_TYPE_CUBE",[Fi]:"ENVMAP_TYPE_CUBE",[Qs]:"ENVMAP_TYPE_CUBE_UV"};function nS(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":aS[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var iS={[Fi]:"ENVMAP_MODE_REFRACTION"};function rS(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":iS[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var sS={[Xl]:"ENVMAP_BLENDING_MULTIPLY",[Qp]:"ENVMAP_BLENDING_MIX",[jp]:"ENVMAP_BLENDING_ADD"};function oS(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":sS[i.combine]||"ENVMAP_BLENDING_NONE"}function lS(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,a=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:a,maxMip:t}}function cS(i,e,t,a){let n=i.getContext(),r=t.defines,s=t.vertexShader,o=t.fragmentShader,l=tS(t),c=nS(t),u=rS(t),f=oS(t),d=lS(t),h=Xy(t),x=Yy(r),g=n.createProgram(),p,m,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(co).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(co).join(`
`),m.length>0&&(m+=`
`)):(p=[Om(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(co).join(`
`),m=[Om(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Qa?"#define TONE_MAPPING":"",t.toneMapping!==Qa?Qe.tonemapping_pars_fragment:"",t.toneMapping!==Qa?Wy("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Qe.colorspace_pars_fragment,Vy("linearToOutputTexel",t.outputColorSpace),qy(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(co).join(`
`)),s=Wd(s),s=Um(s,t),s=Nm(s,t),o=Wd(o),o=Um(o,t),o=Nm(o,t),s=Bm(s),o=Bm(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,p=[h,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",t.glslVersion===yd?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===yd?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let L=y+p+s,v=y+m+o,S=Dm(n,n.VERTEX_SHADER,L),w=Dm(n,n.FRAGMENT_SHADER,v);n.attachShader(g,S),n.attachShader(g,w),t.index0AttributeName!==void 0?n.bindAttribLocation(g,0,t.index0AttributeName):t.hasPositionAttribute===!0&&n.bindAttribLocation(g,0,"position"),n.linkProgram(g);function I(E){if(i.debug.checkShaderErrors){let F=n.getProgramInfoLog(g)||"",U=n.getShaderInfoLog(S)||"",R=n.getShaderInfoLog(w)||"",B=F.trim(),q=U.trim(),H=R.trim(),te=!0,Y=!0;if(n.getProgramParameter(g,n.LINK_STATUS)===!1)if(te=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(n,g,S,w);else{let $=km(n,S,"vertex"),j=km(n,w,"fragment");He("WebGLProgram: Shader Error "+n.getError()+" - VALIDATE_STATUS "+n.getProgramParameter(g,n.VALIDATE_STATUS)+`

Material Name: `+E.name+`
Material Type: `+E.type+`

Program Info Log: `+B+`
`+$+`
`+j)}else B!==""?Oe("WebGLProgram: Program Info Log:",B):(q===""||H==="")&&(Y=!1);Y&&(E.diagnostics={runnable:te,programLog:B,vertexShader:{log:q,prefix:p},fragmentShader:{log:H,prefix:m}})}n.deleteShader(S),n.deleteShader(w),_=new Nr(n,g),C=Zy(n,g)}let _;this.getUniforms=function(){return _===void 0&&I(this),_};let C;this.getAttributes=function(){return C===void 0&&I(this),C};let A=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return A===!1&&(A=n.getProgramParameter(g,By)),A},this.destroy=function(){a.releaseStatesOfProgram(this),n.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Oy++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=S,this.fragmentShader=w,this}var uS=0,qd=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,a){let n=this._getShaderCacheForMaterial(e);return n.has(t)===!1&&(n.add(t),t.usedTimes++),n.has(a)===!1&&(n.add(a),a.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let a of t)a.usedTimes--,a.usedTimes===0&&this.shaderCache.delete(a.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,a=t.get(e);return a===void 0&&(a=new Set,t.set(e,a)),a}_getShaderStage(e){let t=this.shaderCache,a=t.get(e);return a===void 0&&(a=new Xd(e),t.set(e,a)),a}},Xd=class{constructor(e){this.id=uS++,this.code=e,this.usedTimes=0}};function dS(i){return i===ui||i===io||i===ro}function fS(i,e,t,a,n,r){let s=new Ss,o=new qd,l=new Set,c=[],u=new Map,f=a.logarithmicDepthBuffer,d=a.precision,h={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,C,A,E,F,U){let R=E.fog,B=F.geometry,q=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?E.environment:null,H=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,te=e.get(_.envMap||q,H),Y=te&&te.mapping===Qs?te.image.height:null,$=h[_.type];_.precision!==null&&(d=a.getMaxPrecision(_.precision),d!==_.precision&&Oe("WebGLProgram.getParameters:",_.precision,"not supported, using",d,"instead."));let j=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,Ce=j!==void 0?j.length:0,Me=0;B.morphAttributes.position!==void 0&&(Me=1),B.morphAttributes.normal!==void 0&&(Me=2),B.morphAttributes.color!==void 0&&(Me=3);let Je,qe,ot,J;if($){let yt=wn[$];Je=yt.vertexShader,qe=yt.fragmentShader}else{Je=_.vertexShader,qe=_.fragmentShader;let yt=o.getVertexShaderStage(_),dt=o.getFragmentShaderStage(_);o.update(_,yt,dt),ot=yt.id,J=dt.id}let ae=i.getRenderTarget(),ve=i.state.buffers.depth.getReversed(),ze=F.isInstancedMesh===!0,we=F.isBatchedMesh===!0,Ve=!!_.map,pt=!!_.matcap,ne=!!te,se=!!_.aoMap,oe=!!_.lightMap,le=!!_.bumpMap&&_.wireframe===!1,de=!!_.normalMap,Ne=!!_.displacementMap,Ue=!!_.emissiveMap,Ge=!!_.metalnessMap,Ze=!!_.roughnessMap,D=_.anisotropy>0,ut=_.clearcoat>0,et=_.dispersion>0,T=_.retroreflectivity>0,b=_.iridescence>0,z=_.sheen>0,W=_.transmission>0,Z=D&&!!_.anisotropyMap,ce=ut&&!!_.clearcoatMap,ue=ut&&!!_.clearcoatNormalMap,K=ut&&!!_.clearcoatRoughnessMap,ee=b&&!!_.iridescenceMap,he=b&&!!_.iridescenceThicknessMap,De=z&&!!_.sheenColorMap,xe=z&&!!_.sheenRoughnessMap,pe=!!_.specularMap,Fe=!!_.specularColorMap,Be=!!_.specularIntensityMap,Ke=W&&!!_.transmissionMap,N=W&&!!_.thicknessMap,me=!!_.gradientMap,Q=!!_.alphaMap,ge=_.alphaTest>0,Se=!!_.alphaHash,ie=!!_.extensions,ke=Qa;_.toneMapped&&(ae===null||ae.isXRRenderTarget===!0)&&(ke=i.toneMapping);let Re={shaderID:$,shaderType:_.type,shaderName:_.name,vertexShader:Je,fragmentShader:qe,defines:_.defines,customVertexShaderID:ot,customFragmentShaderID:J,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:d,batching:we,batchingColor:we&&F._colorsTexture!==null,instancing:ze,instancingColor:ze&&F.instanceColor!==null,instancingMorph:ze&&F.morphTexture!==null,outputColorSpace:ae===null?i.outputColorSpace:ae.isXRRenderTarget===!0?ae.texture.colorSpace:rt.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Ve,matcap:pt,envMap:ne,envMapMode:ne&&te.mapping,envMapCubeUVHeight:Y,aoMap:se,lightMap:oe,bumpMap:le,normalMap:de,displacementMap:Ne,emissiveMap:Ue,normalMapObjectSpace:de&&_.normalMapType===am,normalMapTangentSpace:de&&_.normalMapType===so,packedNormalMap:de&&_.normalMapType===so&&dS(_.normalMap.format),metalnessMap:Ge,roughnessMap:Ze,anisotropy:D,anisotropyMap:Z,clearcoat:ut,clearcoatMap:ce,clearcoatNormalMap:ue,clearcoatRoughnessMap:K,dispersion:et,retroreflection:T,iridescence:b,iridescenceMap:ee,iridescenceThicknessMap:he,sheen:z,sheenColorMap:De,sheenRoughnessMap:xe,specularMap:pe,specularColorMap:Fe,specularIntensityMap:Be,transmission:W,transmissionMap:Ke,thicknessMap:N,gradientMap:me,opaque:_.transparent===!1&&_.blending===Rr&&_.alphaToCoverage===!1,alphaMap:Q,alphaTest:ge,alphaHash:Se,combine:_.combine,mapUv:Ve&&x(_.map.channel),aoMapUv:se&&x(_.aoMap.channel),lightMapUv:oe&&x(_.lightMap.channel),bumpMapUv:le&&x(_.bumpMap.channel),normalMapUv:de&&x(_.normalMap.channel),displacementMapUv:Ne&&x(_.displacementMap.channel),emissiveMapUv:Ue&&x(_.emissiveMap.channel),metalnessMapUv:Ge&&x(_.metalnessMap.channel),roughnessMapUv:Ze&&x(_.roughnessMap.channel),anisotropyMapUv:Z&&x(_.anisotropyMap.channel),clearcoatMapUv:ce&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:ue&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:K&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:ee&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:he&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:De&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:xe&&x(_.sheenRoughnessMap.channel),specularMapUv:pe&&x(_.specularMap.channel),specularColorMapUv:Fe&&x(_.specularColorMap.channel),specularIntensityMapUv:Be&&x(_.specularIntensityMap.channel),transmissionMapUv:Ke&&x(_.transmissionMap.channel),thicknessMapUv:N&&x(_.thicknessMap.channel),alphaMapUv:Q&&x(_.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(de||D),vertexNormals:!!B.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!B.attributes.uv&&(Ve||Q),fog:!!R,useFog:_.fog===!0,fogExp2:!!R&&R.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||B.attributes.normal===void 0&&de===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:ve,skinning:F.isSkinnedMesh===!0,hasPositionAttribute:B.attributes.position!==void 0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:Ce,morphTextureStride:Me,numSunLights:C.sun.length,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numSunLightShadows:C.sunShadowMap.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numLightProbeGrids:U.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:i.shadowMap.enabled&&A.length>0,shadowMapType:i.shadowMap.type,toneMapping:ke,decodeVideoTexture:Ve&&_.map.isVideoTexture===!0&&rt.getTransfer(_.map.colorSpace)===ht,decodeVideoTextureEmissive:Ue&&_.emissiveMap.isVideoTexture===!0&&rt.getTransfer(_.emissiveMap.colorSpace)===ht,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===vn,flipSided:_.side===Kt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:ie&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ie&&_.extensions.multiDraw===!0||we)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Re.vertexUv1s=l.has(1),Re.vertexUv2s=l.has(2),Re.vertexUv3s=l.has(3),l.clear(),Re}function p(_){let C=[];if(_.shaderID?C.push(_.shaderID):(C.push(_.customVertexShaderID),C.push(_.customFragmentShaderID)),_.defines!==void 0)for(let A in _.defines)C.push(A),C.push(_.defines[A]);return _.isRawShaderMaterial===!1&&(m(C,_),y(C,_),C.push(i.outputColorSpace)),C.push(_.customProgramCacheKey),C.join()}function m(_,C){_.push(C.precision),_.push(C.outputColorSpace),_.push(C.envMapMode),_.push(C.envMapCubeUVHeight),_.push(C.mapUv),_.push(C.alphaMapUv),_.push(C.lightMapUv),_.push(C.aoMapUv),_.push(C.bumpMapUv),_.push(C.normalMapUv),_.push(C.displacementMapUv),_.push(C.emissiveMapUv),_.push(C.metalnessMapUv),_.push(C.roughnessMapUv),_.push(C.anisotropyMapUv),_.push(C.clearcoatMapUv),_.push(C.clearcoatNormalMapUv),_.push(C.clearcoatRoughnessMapUv),_.push(C.iridescenceMapUv),_.push(C.iridescenceThicknessMapUv),_.push(C.sheenColorMapUv),_.push(C.sheenRoughnessMapUv),_.push(C.specularMapUv),_.push(C.specularColorMapUv),_.push(C.specularIntensityMapUv),_.push(C.transmissionMapUv),_.push(C.thicknessMapUv),_.push(C.combine),_.push(C.fogExp2),_.push(C.sizeAttenuation),_.push(C.morphTargetsCount),_.push(C.morphAttributeCount),_.push(C.numSunLights),_.push(C.numDirLights),_.push(C.numPointLights),_.push(C.numSpotLights),_.push(C.numSpotLightMaps),_.push(C.numHemiLights),_.push(C.numRectAreaLights),_.push(C.numSunLightShadows),_.push(C.numDirLightShadows),_.push(C.numPointLightShadows),_.push(C.numSpotLightShadows),_.push(C.numSpotLightShadowsWithMaps),_.push(C.numLightProbes),_.push(C.shadowMapType),_.push(C.toneMapping),_.push(C.numClippingPlanes),_.push(C.numClipIntersection),_.push(C.depthPacking)}function y(_,C){s.disableAll(),C.instancing&&s.enable(0),C.instancingColor&&s.enable(1),C.instancingMorph&&s.enable(2),C.matcap&&s.enable(3),C.envMap&&s.enable(4),C.normalMapObjectSpace&&s.enable(5),C.normalMapTangentSpace&&s.enable(6),C.clearcoat&&s.enable(7),C.iridescence&&s.enable(8),C.alphaTest&&s.enable(9),C.vertexColors&&s.enable(10),C.vertexAlphas&&s.enable(11),C.vertexUv1s&&s.enable(12),C.vertexUv2s&&s.enable(13),C.vertexUv3s&&s.enable(14),C.vertexTangents&&s.enable(15),C.anisotropy&&s.enable(16),C.alphaHash&&s.enable(17),C.batching&&s.enable(18),C.dispersion&&s.enable(19),C.retroreflection&&s.enable(24),C.batchingColor&&s.enable(20),C.gradientMap&&s.enable(21),C.packedNormalMap&&s.enable(22),C.vertexNormals&&s.enable(23),_.push(s.mask),s.disableAll(),C.fog&&s.enable(0),C.useFog&&s.enable(1),C.flatShading&&s.enable(2),C.logarithmicDepthBuffer&&s.enable(3),C.reversedDepthBuffer&&s.enable(4),C.skinning&&s.enable(5),C.morphTargets&&s.enable(6),C.morphNormals&&s.enable(7),C.morphColors&&s.enable(8),C.premultipliedAlpha&&s.enable(9),C.shadowMapEnabled&&s.enable(10),C.doubleSided&&s.enable(11),C.flipSided&&s.enable(12),C.useDepthPacking&&s.enable(13),C.dithering&&s.enable(14),C.transmission&&s.enable(15),C.sheen&&s.enable(16),C.opaque&&s.enable(17),C.pointsUvs&&s.enable(18),C.decodeVideoTexture&&s.enable(19),C.decodeVideoTextureEmissive&&s.enable(20),C.alphaToCoverage&&s.enable(21),C.numLightProbeGrids>0&&s.enable(22),C.hasPositionAttribute&&s.enable(23),_.push(s.mask)}function L(_){let C=h[_.type],A;if(C){let E=wn[C];A=bm.clone(E.uniforms)}else A=_.uniforms;return A}function v(_,C){let A=u.get(C);return A!==void 0?++A.usedTimes:(A=new cS(i,C,_,n),c.push(A),u.set(C,A)),A}function S(_){if(--_.usedTimes===0){let C=c.indexOf(_);c[C]=c[c.length-1],c.pop(),u.delete(_.cacheKey),_.destroy()}}function w(_){o.remove(_)}function I(){o.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:L,acquireProgram:v,releaseProgram:S,releaseShaderCache:w,programs:c,dispose:I}}function hS(){let i=new WeakMap;function e(s){return i.has(s)}function t(s){let o=i.get(s);return o===void 0&&(o={},i.set(s,o)),o}function a(s){i.delete(s)}function n(s,o,l){i.get(s)[o]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:a,update:n,dispose:r}}function pS(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function zm(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Hm(){let i=[],e=0,t=[],a=[],n=[];function r(){e=0,t.length=0,a.length=0,n.length=0}function s(d){let h=0;return d.isInstancedMesh&&(h+=2),d.isSkinnedMesh&&(h+=1),h}function o(d,h,x,g,p,m){let y=i[e];return y===void 0?(y={id:d.id,object:d,geometry:h,material:x,materialVariant:s(d),groupOrder:g,renderOrder:d.renderOrder,z:p,group:m},i[e]=y):(y.id=d.id,y.object=d,y.geometry=h,y.material=x,y.materialVariant=s(d),y.groupOrder=g,y.renderOrder=d.renderOrder,y.z=p,y.group=m),e++,y}function l(d,h,x,g,p,m,y){y.reversedDepth===!0&&(p=-p);let L=o(d,h,x,g,p,m);x.transmission>0?a.push(L):x.transparent===!0?n.push(L):t.push(L)}function c(d,h,x,g,p,m){let y=o(d,h,x,g,p,m);x.transmission>0?a.unshift(y):x.transparent===!0?n.unshift(y):t.unshift(y)}function u(d,h){t.length>1&&t.sort(d||pS),a.length>1&&a.sort(h||zm),n.length>1&&n.sort(h||zm)}function f(){for(let d=e,h=i.length;d<h;d++){let x=i[d];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:t,transmissive:a,transparent:n,init:r,push:l,unshift:c,finish:f,sort:u}}function mS(){let i=new WeakMap;function e(a,n){let r=i.get(a),s;return r===void 0?(s=new Hm,i.set(a,[s])):n>=r.length?(s=new Hm,r.push(s)):s=r[n],s}function t(){i=new WeakMap}return{get:e,dispose:t}}function gS(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new O,color:new Xe};break;case"SpotLight":t={position:new O,direction:new O,color:new Xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new Xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new Xe,groundColor:new Xe};break;case"RectAreaLight":t={color:new Xe,position:new O,halfWidth:new O,halfHeight:new O};break}return i[e.id]=t,t}}}function xS(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new fe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new fe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new fe,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var _S=0;function vS(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function bS(i){let e=new gS,t=xS(),a={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)a.probe.push(new O);let n=new O,r=new xt,s=new xt;function o(c){let u=0,f=0,d=0;for(let F=0;F<9;F++)a.probe[F].set(0,0,0);let h=0,x=0,g=0,p=0,m=0,y=0,L=0,v=0,S=0,w=0,I=0,_=0,C=0,A=0;c.sort(vS);for(let F=0,U=c.length;F<U;F++){let R=c[F],B=R.color,q=R.intensity,H=R.distance,te=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===ui?te=R.shadow.map.texture:te=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)u+=B.r*q,f+=B.g*q,d+=B.b*q;else if(R.isLightProbe){for(let Y=0;Y<9;Y++)a.probe[Y].addScaledVector(R.sh.coefficients[Y],q);A++}else if(R.isSunLight){let Y=e.get(R);if(Y.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let $=R.shadow,j=t.get(R);j.shadowIntensity=$.intensity,j.shadowBias=$.bias,j.shadowNormalBias=$.normalBias,j.shadowRadius=$.radius,j.shadowMapSize.copy($.mapSize).multiply($.getFrameExtents()),a.sunShadow[x]=j,a.sunShadowMap[x]=te;let Ce=$.getViewportCount();for(let Me=0;Me<Ce;Me++)a.sunShadowMatrix[g+Me]=$.getMatrix(Me),a.sunShadowCascade[g+Me]=$._cascadeData[Me];g+=Ce,x++}a.sun[h]=Y,h++}else if(R.isDirectionalLight){let Y=e.get(R);if(Y.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let $=R.shadow,j=t.get(R);j.shadowIntensity=$.intensity,j.shadowBias=$.bias,j.shadowNormalBias=$.normalBias,j.shadowRadius=$.radius,j.shadowMapSize=$.mapSize,a.directionalShadow[p]=j,a.directionalShadowMap[p]=te,a.directionalShadowMatrix[p]=R.shadow.matrix,S++}a.directional[p]=Y,p++}else if(R.isSpotLight){let Y=e.get(R);Y.position.setFromMatrixPosition(R.matrixWorld),Y.color.copy(B).multiplyScalar(q),Y.distance=H,Y.coneCos=Math.cos(R.angle),Y.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),Y.decay=R.decay,a.spot[y]=Y;let $=R.shadow;if(R.map&&(a.spotLightMap[_]=R.map,_++,$.updateMatrices(R),R.castShadow&&C++),a.spotLightMatrix[y]=$.matrix,R.castShadow){let j=t.get(R);j.shadowIntensity=$.intensity,j.shadowBias=$.bias,j.shadowNormalBias=$.normalBias,j.shadowRadius=$.radius,j.shadowMapSize=$.mapSize,a.spotShadow[y]=j,a.spotShadowMap[y]=te,I++}y++}else if(R.isRectAreaLight){let Y=e.get(R);Y.color.copy(B).multiplyScalar(q),Y.halfWidth.set(R.width*.5,0,0),Y.halfHeight.set(0,R.height*.5,0),a.rectArea[L]=Y,L++}else if(R.isPointLight){let Y=e.get(R);if(Y.color.copy(R.color).multiplyScalar(R.intensity),Y.distance=R.distance,Y.decay=R.decay,R.castShadow){let $=R.shadow,j=t.get(R);j.shadowIntensity=$.intensity,j.shadowBias=$.bias,j.shadowNormalBias=$.normalBias,j.shadowRadius=$.radius,j.shadowMapSize=$.mapSize,j.shadowCameraNear=$.camera.near,j.shadowCameraFar=$.camera.far,a.pointShadow[m]=j,a.pointShadowMap[m]=te,a.pointShadowMatrix[m]=R.shadow.matrix,w++}a.point[m]=Y,m++}else if(R.isHemisphereLight){let Y=e.get(R);Y.skyColor.copy(R.color).multiplyScalar(q),Y.groundColor.copy(R.groundColor).multiplyScalar(q),a.hemi[v]=Y,v++}}L>0&&(i.has("OES_texture_float_linear")===!0?(a.rectAreaLTC1=_e.LTC_FLOAT_1,a.rectAreaLTC2=_e.LTC_FLOAT_2):(a.rectAreaLTC1=_e.LTC_HALF_1,a.rectAreaLTC2=_e.LTC_HALF_2)),a.ambient[0]=u,a.ambient[1]=f,a.ambient[2]=d;let E=a.hash;(E.sunLength!==h||E.directionalLength!==p||E.pointLength!==m||E.spotLength!==y||E.rectAreaLength!==L||E.hemiLength!==v||E.numSunShadows!==x||E.numDirectionalShadows!==S||E.numPointShadows!==w||E.numSpotShadows!==I||E.numSpotMaps!==_||E.numLightProbes!==A)&&(a.sun.length=h,a.directional.length=p,a.spot.length=y,a.rectArea.length=L,a.point.length=m,a.hemi.length=v,a.sunShadow.length=x,a.sunShadowMap.length=x,a.sunShadowMatrix.length=g,a.sunShadowCascade.length=g,a.directionalShadow.length=S,a.directionalShadowMap.length=S,a.directionalShadowMatrix.length=S,a.pointShadow.length=w,a.pointShadowMap.length=w,a.pointShadowMatrix.length=w,a.spotShadow.length=I,a.spotShadowMap.length=I,a.spotLightMatrix.length=I+_-C,a.spotLightMap.length=_,a.numSpotLightShadowsWithMaps=C,a.numLightProbes=A,E.sunLength=h,E.directionalLength=p,E.pointLength=m,E.spotLength=y,E.rectAreaLength=L,E.hemiLength=v,E.numSunShadows=x,E.numDirectionalShadows=S,E.numPointShadows=w,E.numSpotShadows=I,E.numSpotMaps=_,E.numLightProbes=A,a.version=_S++)}function l(c,u){let f=0,d=0,h=0,x=0,g=0,p=0,m=u.matrixWorldInverse;for(let y=0,L=c.length;y<L;y++){let v=c[y];if(v.isSunLight){let S=a.sun[f];S.direction.setFromMatrixPosition(v.matrixWorld),S.direction.transformDirection(m),f++}else if(v.isDirectionalLight){let S=a.directional[d];S.direction.setFromMatrixPosition(v.matrixWorld),n.setFromMatrixPosition(v.target.matrixWorld),S.direction.sub(n),S.direction.transformDirection(m),d++}else if(v.isSpotLight){let S=a.spot[x];S.position.setFromMatrixPosition(v.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(v.matrixWorld),n.setFromMatrixPosition(v.target.matrixWorld),S.direction.sub(n),S.direction.transformDirection(m),x++}else if(v.isRectAreaLight){let S=a.rectArea[g];S.position.setFromMatrixPosition(v.matrixWorld),S.position.applyMatrix4(m),s.identity(),r.copy(v.matrixWorld),r.premultiply(m),s.extractRotation(r),S.halfWidth.set(v.width*.5,0,0),S.halfHeight.set(0,v.height*.5,0),S.halfWidth.applyMatrix4(s),S.halfHeight.applyMatrix4(s),g++}else if(v.isPointLight){let S=a.point[h];S.position.setFromMatrixPosition(v.matrixWorld),S.position.applyMatrix4(m),h++}else if(v.isHemisphereLight){let S=a.hemi[p];S.direction.setFromMatrixPosition(v.matrixWorld),S.direction.transformDirection(m),p++}}}return{setup:o,setupView:l,state:a}}function Vm(i){let e=new bS(i),t=[],a=[],n=[];function r(d){f.camera=d,t.length=0,a.length=0,n.length=0}function s(d){t.push(d)}function o(d){a.push(d)}function l(d){n.push(d)}function c(){e.setup(t)}function u(d){e.setupView(t,d)}let f={lightsArray:t,shadowsArray:a,lightProbeGridArray:n,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:f,setupLights:c,setupLightsView:u,pushLight:s,pushShadow:o,pushLightProbeGrid:l}}function yS(i){let e=new WeakMap;function t(n,r=0){let s=e.get(n),o;return s===void 0?(o=new Vm(i),e.set(n,[o])):r>=s.length?(o=new Vm(i),s.push(o)):o=s[r],o}function a(){e=new WeakMap}return{get:t,dispose:a}}var SS=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wS=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,MS=[new O(1,0,0),new O(-1,0,0),new O(0,1,0),new O(0,-1,0),new O(0,0,1),new O(0,0,-1)],LS=[new O(0,-1,0),new O(0,-1,0),new O(0,0,1),new O(0,0,-1),new O(0,-1,0),new O(0,-1,0)],Gm=new xt,lo=new O,Od=new O;function CS(i,e,t){let a=new wr,n=new fe,r=new fe,s=new Ct,o=new Rl,l=new Pl,c={},u=t.maxTextureSize,f={[oi]:Kt,[Kt]:oi,[vn]:vn},d=new Ia({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new fe},radius:{value:4}},vertexShader:SS,fragmentShader:wS}),h=d.clone();h.defines.HORIZONTAL_PASS=1;let x=new aa;x.setAttribute("position",new fa(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new nt(x,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ks;let m=this.type;this.render=function(w,I,_){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===Dp&&(Oe("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Ks);let C=i.getRenderTarget(),A=i.getActiveCubeFace(),E=i.getActiveMipmapLevel(),F=i.state;F.setBlending(bn),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);let U=m!==this.type;U&&I.traverse(function(R){R.material&&(Array.isArray(R.material)?R.material.forEach(B=>B.needsUpdate=!0):R.material.needsUpdate=!0)});for(let R=0,B=w.length;R<B;R++){let q=w[R],H=q.shadow;if(H===void 0){Oe("WebGLShadowMap:",q,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;n.copy(H.mapSize);let te=H.getFrameExtents();n.multiply(te),r.copy(H.mapSize),(n.x>u||n.y>u)&&(n.x>u&&(r.x=Math.floor(u/te.x),n.x=r.x*te.x,H.mapSize.x=r.x),n.y>u&&(r.y=Math.floor(u/te.y),n.y=r.y*te.y,H.mapSize.y=r.y));let Y=i.state.buffers.depth.getReversed();if(H.camera._reversedDepth=Y,H.map===null||U===!0){if(H.map!==null&&(H.map.depthTexture!==null&&(H.map.depthTexture.dispose(),H.map.depthTexture=null),H.map.dispose()),this.type===Er){if(q.isPointLight){Oe("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}H.map=new ga(n.x,n.y,{format:ui,type:en,minFilter:Ht,magFilter:Ht,generateMipmaps:!1}),H.map.texture.name=q.name+".shadowMap",H.map.depthTexture=new ai(n.x,n.y,Ba),H.map.depthTexture.name=q.name+".shadowMapDepth",H.map.depthTexture.format=fn,H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=Yt,H.map.depthTexture.magFilter=Yt}else q.isPointLight?(H.map=new Nc(n.x),H.map.depthTexture=new wl(n.x,ja)):(H.map=new ga(n.x,n.y),H.map.depthTexture=new ai(n.x,n.y,ja)),H.map.depthTexture.name=q.name+".shadowMap",H.map.depthTexture.format=fn,this.type===Ks?(H.map.depthTexture.compareFunction=Y?Fc:Dc,H.map.depthTexture.minFilter=Ht,H.map.depthTexture.magFilter=Ht):(H.map.depthTexture.compareFunction=null,H.map.depthTexture.minFilter=Yt,H.map.depthTexture.magFilter=Yt);H.camera.updateProjectionMatrix()}H.map.isWebGLCubeRenderTarget!==!0&&(H.map.width!==n.x||H.map.height!==n.y)&&H.map.setSize(n.x,n.y);let $=H.map.isWebGLCubeRenderTarget?6:H.getViewportCount();q.isPointLight!==!0&&H.updateMatrices(q,_);for(let j=0;j<$;j++){let Ce=H.getCamera(j);if(q.isPointLight){let Me=H.camera,Je=H.matrix,qe=q.distance||Me.far;qe!==Me.far&&(Me.far=qe,Me.updateProjectionMatrix()),lo.setFromMatrixPosition(q.matrixWorld),Me.position.copy(lo),Od.copy(Me.position),Od.add(MS[j]),Me.up.copy(LS[j]),Me.lookAt(Od),Me.updateMatrixWorld(),Je.makeTranslation(-lo.x,-lo.y,-lo.z),Gm.multiplyMatrices(Me.projectionMatrix,Me.matrixWorldInverse),H._frustum.setFromProjectionMatrix(Gm,Me.coordinateSystem,Me.reversedDepth)}if(H.map.isWebGLCubeRenderTarget)i.setRenderTarget(H.map,j),i.clear();else{j===0&&(i.setRenderTarget(H.map),i.clear());let Me=H.getViewport(j);s.set(r.x*Me.x,r.y*Me.y,r.x*Me.z,r.y*Me.w),F.viewport(s)}a=H.getFrustum(j),v(I,_,Ce,q,this.type)}H.isPointLightShadow!==!0&&this.type===Er&&y(H,_),H.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(C,A,E)};function y(w,I){let _=e.update(g);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,h.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,h.needsUpdate=!0),w.mapPass===null?w.mapPass=new ga(n.x,n.y,{format:ui,type:en}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),d.uniforms.shadow_pass.value=w.map.depthTexture,d.uniforms.resolution.value.set(w.map.width,w.map.height),d.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(I,null,_,d,g,null),h.uniforms.shadow_pass.value=w.mapPass.texture,h.uniforms.resolution.value.set(w.map.width,w.map.height),h.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(I,null,_,h,g,null)}function L(w,I,_,C){let A=null,E=_.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(E!==void 0)A=E;else if(A=_.isPointLight===!0?l:o,i.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0||I.alphaToCoverage===!0){let F=A.uuid,U=I.uuid,R=c[F];R===void 0&&(R={},c[F]=R);let B=R[U];B===void 0&&(B=A.clone(),R[U]=B,I.addEventListener("dispose",S)),A=B}if(A.visible=I.visible,A.wireframe=I.wireframe,C===Er?A.side=I.shadowSide!==null?I.shadowSide:I.side:A.side=I.shadowSide!==null?I.shadowSide:f[I.side],A.alphaMap=I.alphaMap,A.alphaTest=I.alphaToCoverage===!0?.5:I.alphaTest,A.map=I.map,A.clipShadows=I.clipShadows,A.clippingPlanes=I.clippingPlanes,A.clipIntersection=I.clipIntersection,A.displacementMap=I.displacementMap,A.displacementScale=I.displacementScale,A.displacementBias=I.displacementBias,A.wireframeLinewidth=I.wireframeLinewidth,A.linewidth=I.linewidth,_.isPointLight===!0&&A.isMeshDistanceMaterial===!0){let F=i.properties.get(A);F.light=_}return A}function v(w,I,_,C,A){if(w.visible===!1)return;if(w.layers.test(I.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&A===Er)&&(!w.frustumCulled||w.intersectsFrustum(a))){w.modelViewMatrix.multiplyMatrices(_.matrixWorldInverse,w.matrixWorld);let U=e.update(w),R=w.material;if(Array.isArray(R)){let B=U.groups;for(let q=0,H=B.length;q<H;q++){let te=B[q],Y=R[te.materialIndex];if(Y&&Y.visible){let $=L(w,Y,C,A);w.onBeforeShadow(i,w,I,_,U,$,te),i.renderBufferDirect(_,null,U,$,w,te),w.onAfterShadow(i,w,I,_,U,$,te)}}}else if(R.visible){let B=L(w,R,C,A);w.onBeforeShadow(i,w,I,_,U,B,null),i.renderBufferDirect(_,null,U,B,w,null),w.onAfterShadow(i,w,I,_,U,B,null)}}let F=w.children;for(let U=0,R=F.length;U<R;U++)v(F[U],I,_,C,A)}function S(w){w.target.removeEventListener("dispose",S);for(let _ in c){let C=c[_],A=w.target.uuid;A in C&&(C[A].dispose(),delete C[A])}}}function IS(i,e){function t(){let N=!1,me=new Ct,Q=null,ge=new Ct(0,0,0,0);return{setMask:function(Se){Q!==Se&&!N&&(i.colorMask(Se,Se,Se,Se),Q=Se)},setLocked:function(Se){N=Se},setClear:function(Se,ie,ke,Re,yt){yt===!0&&(Se*=Re,ie*=Re,ke*=Re),me.set(Se,ie,ke,Re),ge.equals(me)===!1&&(i.clearColor(Se,ie,ke,Re),ge.copy(me))},reset:function(){N=!1,Q=null,ge.set(-1,0,0,0)}}}function a(){let N=!1,me=!1,Q=null,ge=null,Se=null;return{setReversed:function(ie){if(me!==ie){let ke=e.get("EXT_clip_control");ie?ke.clipControlEXT(ke.LOWER_LEFT_EXT,ke.ZERO_TO_ONE_EXT):ke.clipControlEXT(ke.LOWER_LEFT_EXT,ke.NEGATIVE_ONE_TO_ONE_EXT),me=ie;let Re=Se;Se=null,this.setClear(Re)}},getReversed:function(){return me},setTest:function(ie){ie?ae(i.DEPTH_TEST):ve(i.DEPTH_TEST)},setMask:function(ie){Q!==ie&&!N&&(i.depthMask(ie),Q=ie)},setFunc:function(ie){if(me&&(ie=pm[ie]),ge!==ie){switch(ie){case ul:i.depthFunc(i.NEVER);break;case dl:i.depthFunc(i.ALWAYS);break;case fl:i.depthFunc(i.LESS);break;case xr:i.depthFunc(i.LEQUAL);break;case hl:i.depthFunc(i.EQUAL);break;case pl:i.depthFunc(i.GEQUAL);break;case ml:i.depthFunc(i.GREATER);break;case gl:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ge=ie}},setLocked:function(ie){N=ie},setClear:function(ie){Se!==ie&&(Se=ie,me&&(ie=1-ie),i.clearDepth(ie))},reset:function(){N=!1,Q=null,ge=null,Se=null,me=!1}}}function n(){let N=!1,me=null,Q=null,ge=null,Se=null,ie=null,ke=null,Re=null,yt=null;return{setTest:function(dt){N||(dt?ae(i.STENCIL_TEST):ve(i.STENCIL_TEST))},setMask:function(dt){me!==dt&&!N&&(i.stencilMask(dt),me=dt)},setFunc:function(dt,qa,nn){(Q!==dt||ge!==qa||Se!==nn)&&(i.stencilFunc(dt,qa,nn),Q=dt,ge=qa,Se=nn)},setOp:function(dt,qa,nn){(ie!==dt||ke!==qa||Re!==nn)&&(i.stencilOp(dt,qa,nn),ie=dt,ke=qa,Re=nn)},setLocked:function(dt){N=dt},setClear:function(dt){yt!==dt&&(i.clearStencil(dt),yt=dt)},reset:function(){N=!1,me=null,Q=null,ge=null,Se=null,ie=null,ke=null,Re=null,yt=null}}}let r=new t,s=new a,o=new n,l=new WeakMap,c=new WeakMap,u={},f={},d={},h=new WeakMap,x=[],g=null,p=!1,m=null,y=null,L=null,v=null,S=null,w=null,I=null,_=new Xe(0,0,0),C=0,A=!1,E=null,F=null,U=null,R=null,B=null,q=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),H=!1,te=0,Y=i.getParameter(i.VERSION);Y.indexOf("WebGL")!==-1?(te=parseFloat(/^WebGL (\d)/.exec(Y)[1]),H=te>=1):Y.indexOf("OpenGL ES")!==-1&&(te=parseFloat(/^OpenGL ES (\d)/.exec(Y)[1]),H=te>=2);let $=null,j={},Ce=i.getParameter(i.SCISSOR_BOX),Me=i.getParameter(i.VIEWPORT),Je=new Ct().fromArray(Ce),qe=new Ct().fromArray(Me);function ot(N,me,Q,ge){let Se=new Uint8Array(4),ie=i.createTexture();i.bindTexture(N,ie),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ke=0;ke<Q;ke++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(me,0,i.RGBA,1,1,ge,0,i.RGBA,i.UNSIGNED_BYTE,Se):i.texImage2D(me+ke,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Se);return ie}let J={};J[i.TEXTURE_2D]=ot(i.TEXTURE_2D,i.TEXTURE_2D,1),J[i.TEXTURE_CUBE_MAP]=ot(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),J[i.TEXTURE_2D_ARRAY]=ot(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),J[i.TEXTURE_3D]=ot(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),s.setClear(1),o.setClear(0),ae(i.DEPTH_TEST),s.setFunc(xr),le(!1),de(nd),ae(i.CULL_FACE),se(bn);function ae(N){u[N]!==!0&&(i.enable(N),u[N]=!0)}function ve(N){u[N]!==!1&&(i.disable(N),u[N]=!1)}function ze(N,me){return d[N]!==me?(i.bindFramebuffer(N,me),d[N]=me,N===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=me),N===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=me),!0):!1}function we(N,me){let Q=x,ge=!1;if(N){Q=h.get(me),Q===void 0&&(Q=[],h.set(me,Q));let Se=N.textures;if(Q.length!==Se.length||Q[0]!==i.COLOR_ATTACHMENT0){for(let ie=0,ke=Se.length;ie<ke;ie++)Q[ie]=i.COLOR_ATTACHMENT0+ie;Q.length=Se.length,ge=!0}}else Q[0]!==i.BACK&&(Q[0]=i.BACK,ge=!0);ge&&i.drawBuffers(Q)}function Ve(N){return g!==N?(i.useProgram(N),g=N,!0):!1}let pt={[Di]:i.FUNC_ADD,[kp]:i.FUNC_SUBTRACT,[Up]:i.FUNC_REVERSE_SUBTRACT};pt[Np]=i.MIN,pt[Bp]=i.MAX;let ne={[Op]:i.ZERO,[zp]:i.ONE,[Hp]:i.SRC_COLOR,[sd]:i.SRC_ALPHA,[Yp]:i.SRC_ALPHA_SATURATE,[qp]:i.DST_COLOR,[Gp]:i.DST_ALPHA,[Vp]:i.ONE_MINUS_SRC_COLOR,[od]:i.ONE_MINUS_SRC_ALPHA,[Xp]:i.ONE_MINUS_DST_COLOR,[Wp]:i.ONE_MINUS_DST_ALPHA,[Zp]:i.CONSTANT_COLOR,[Kp]:i.ONE_MINUS_CONSTANT_COLOR,[Jp]:i.CONSTANT_ALPHA,[$p]:i.ONE_MINUS_CONSTANT_ALPHA};function se(N,me,Q,ge,Se,ie,ke,Re,yt,dt){if(N===bn){p===!0&&(ve(i.BLEND),p=!1);return}if(p===!1&&(ae(i.BLEND),p=!0),N!==Fp){if(N!==m||dt!==A){if((y!==Di||S!==Di)&&(i.blendEquation(i.FUNC_ADD),y=Di,S=Di),dt)switch(N){case Rr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Js:i.blendFunc(i.ONE,i.ONE);break;case id:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case rd:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:He("WebGLState: Invalid blending: ",N);break}else switch(N){case Rr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Js:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case id:He("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case rd:He("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:He("WebGLState: Invalid blending: ",N);break}L=null,v=null,w=null,I=null,_.set(0,0,0),C=0,m=N,A=dt}return}Se=Se||me,ie=ie||Q,ke=ke||ge,(me!==y||Se!==S)&&(i.blendEquationSeparate(pt[me],pt[Se]),y=me,S=Se),(Q!==L||ge!==v||ie!==w||ke!==I)&&(i.blendFuncSeparate(ne[Q],ne[ge],ne[ie],ne[ke]),L=Q,v=ge,w=ie,I=ke),(Re.equals(_)===!1||yt!==C)&&(i.blendColor(Re.r,Re.g,Re.b,yt),_.copy(Re),C=yt),m=N,A=!1}function oe(N,me){N.side===vn?ve(i.CULL_FACE):ae(i.CULL_FACE);let Q=N.side===Kt;me&&(Q=!Q),le(Q),N.blending===Rr&&N.transparent===!1?se(bn):se(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),s.setFunc(N.depthFunc),s.setTest(N.depthTest),s.setMask(N.depthWrite),r.setMask(N.colorWrite);let ge=N.stencilWrite;o.setTest(ge),ge&&(o.setMask(N.stencilWriteMask),o.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),o.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),Ue(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?ae(i.SAMPLE_ALPHA_TO_COVERAGE):ve(i.SAMPLE_ALPHA_TO_COVERAGE)}function le(N){E!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),E=N)}function de(N){N!==Rp?(ae(i.CULL_FACE),N!==F&&(N===nd?i.cullFace(i.BACK):N===Pp?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):ve(i.CULL_FACE),F=N}function Ne(N){N!==U&&(H&&i.lineWidth(N),U=N)}function Ue(N,me,Q){N?(ae(i.POLYGON_OFFSET_FILL),(R!==me||B!==Q)&&(R=me,B=Q,s.getReversed()&&(me=-me),i.polygonOffset(me,Q))):ve(i.POLYGON_OFFSET_FILL)}function Ge(N){N?ae(i.SCISSOR_TEST):ve(i.SCISSOR_TEST)}function Ze(N){N===void 0&&(N=i.TEXTURE0+q-1),$!==N&&(i.activeTexture(N),$=N)}function D(N,me,Q){Q===void 0&&($===null?Q=i.TEXTURE0+q-1:Q=$);let ge=j[Q];ge===void 0&&(ge={type:void 0,texture:void 0},j[Q]=ge),(ge.type!==N||ge.texture!==me)&&($!==Q&&(i.activeTexture(Q),$=Q),i.bindTexture(N,me||J[N]),ge.type=N,ge.texture=me)}function ut(){let N=j[$];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function et(){try{i.compressedTexImage2D(...arguments)}catch(N){He("WebGLState:",N)}}function T(){try{i.compressedTexImage3D(...arguments)}catch(N){He("WebGLState:",N)}}function b(){try{i.texSubImage2D(...arguments)}catch(N){He("WebGLState:",N)}}function z(){try{i.texSubImage3D(...arguments)}catch(N){He("WebGLState:",N)}}function W(){try{i.compressedTexSubImage2D(...arguments)}catch(N){He("WebGLState:",N)}}function Z(){try{i.compressedTexSubImage3D(...arguments)}catch(N){He("WebGLState:",N)}}function ce(){try{i.texStorage2D(...arguments)}catch(N){He("WebGLState:",N)}}function ue(){try{i.texStorage3D(...arguments)}catch(N){He("WebGLState:",N)}}function K(){try{i.texImage2D(...arguments)}catch(N){He("WebGLState:",N)}}function ee(){try{i.texImage3D(...arguments)}catch(N){He("WebGLState:",N)}}function he(N){return f[N]!==void 0?f[N]:i.getParameter(N)}function De(N,me){f[N]!==me&&(i.pixelStorei(N,me),f[N]=me)}function xe(N){Je.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),Je.copy(N))}function pe(N){qe.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),qe.copy(N))}function Fe(N,me){let Q=c.get(me);Q===void 0&&(Q=new WeakMap,c.set(me,Q));let ge=Q.get(N);ge===void 0&&(ge=i.getUniformBlockIndex(me,N.name),Q.set(N,ge))}function Be(N,me){let ge=c.get(me).get(N);l.get(me)!==ge&&(i.uniformBlockBinding(me,ge,N.__bindingPointIndex),l.set(me,ge))}function Ke(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),s.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),u={},f={},$=null,j={},d={},h=new WeakMap,x=[],g=null,p=!1,m=null,y=null,L=null,v=null,S=null,w=null,I=null,_=new Xe(0,0,0),C=0,A=!1,E=null,F=null,U=null,R=null,B=null,Je.set(0,0,i.canvas.width,i.canvas.height),qe.set(0,0,i.canvas.width,i.canvas.height),r.reset(),s.reset(),o.reset()}return{buffers:{color:r,depth:s,stencil:o},enable:ae,disable:ve,bindFramebuffer:ze,drawBuffers:we,useProgram:Ve,setBlending:se,setMaterial:oe,setFlipSided:le,setCullFace:de,setLineWidth:Ne,setPolygonOffset:Ue,setScissorTest:Ge,activeTexture:Ze,bindTexture:D,unbindTexture:ut,compressedTexImage2D:et,compressedTexImage3D:T,texImage2D:K,texImage3D:ee,pixelStorei:De,getParameter:he,updateUBOMapping:Fe,uniformBlockBinding:Be,texStorage2D:ce,texStorage3D:ue,texSubImage2D:b,texSubImage3D:z,compressedTexSubImage2D:W,compressedTexSubImage3D:Z,scissor:xe,viewport:pe,reset:Ke}}function TS(i,e,t,a,n,r,s){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new fe,u=new WeakMap,f=new Set,d,h=new WeakMap,x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(T,b){return x?new OffscreenCanvas(T,b):bs("canvas")}function p(T,b,z){let W=1,Z=et(T);if((Z.width>z||Z.height>z)&&(W=z/Math.max(Z.width,Z.height)),W<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){let ce=Math.floor(W*Z.width),ue=Math.floor(W*Z.height);d===void 0&&(d=g(ce,ue));let K=b?g(ce,ue):d;return K.width=ce,K.height=ue,K.getContext("2d").drawImage(T,0,0,ce,ue),Oe("WebGLRenderer: Texture has been resized from ("+Z.width+"x"+Z.height+") to ("+ce+"x"+ue+")."),K}else return"data"in T&&Oe("WebGLRenderer: Image in DataTexture is too big ("+Z.width+"x"+Z.height+")."),T;return T}function m(T){return T.generateMipmaps}function y(T){i.generateMipmap(T)}function L(T){return T.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?i.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(T,b,z,W,Z,ce=!1){if(T!==null){if(i[T]!==void 0)return i[T];Oe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let ue;W&&(ue=e.get("EXT_texture_norm16"),ue||Oe("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let K=b;if(b===i.RED&&(z===i.FLOAT&&(K=i.R32F),z===i.HALF_FLOAT&&(K=i.R16F),z===i.UNSIGNED_BYTE&&(K=i.R8),z===i.UNSIGNED_SHORT&&ue&&(K=ue.R16_EXT),z===i.SHORT&&ue&&(K=ue.R16_SNORM_EXT)),b===i.RED_INTEGER&&(z===i.UNSIGNED_BYTE&&(K=i.R8UI),z===i.UNSIGNED_SHORT&&(K=i.R16UI),z===i.UNSIGNED_INT&&(K=i.R32UI),z===i.BYTE&&(K=i.R8I),z===i.SHORT&&(K=i.R16I),z===i.INT&&(K=i.R32I)),b===i.RG&&(z===i.FLOAT&&(K=i.RG32F),z===i.HALF_FLOAT&&(K=i.RG16F),z===i.UNSIGNED_BYTE&&(K=i.RG8),z===i.UNSIGNED_SHORT&&ue&&(K=ue.RG16_EXT),z===i.SHORT&&ue&&(K=ue.RG16_SNORM_EXT)),b===i.RG_INTEGER&&(z===i.UNSIGNED_BYTE&&(K=i.RG8UI),z===i.UNSIGNED_SHORT&&(K=i.RG16UI),z===i.UNSIGNED_INT&&(K=i.RG32UI),z===i.BYTE&&(K=i.RG8I),z===i.SHORT&&(K=i.RG16I),z===i.INT&&(K=i.RG32I)),b===i.RGB_INTEGER&&(z===i.UNSIGNED_BYTE&&(K=i.RGB8UI),z===i.UNSIGNED_SHORT&&(K=i.RGB16UI),z===i.UNSIGNED_INT&&(K=i.RGB32UI),z===i.BYTE&&(K=i.RGB8I),z===i.SHORT&&(K=i.RGB16I),z===i.INT&&(K=i.RGB32I)),b===i.RGBA_INTEGER&&(z===i.UNSIGNED_BYTE&&(K=i.RGBA8UI),z===i.UNSIGNED_SHORT&&(K=i.RGBA16UI),z===i.UNSIGNED_INT&&(K=i.RGBA32UI),z===i.BYTE&&(K=i.RGBA8I),z===i.SHORT&&(K=i.RGBA16I),z===i.INT&&(K=i.RGBA32I)),b===i.RGB&&(z===i.UNSIGNED_SHORT&&ue&&(K=ue.RGB16_EXT),z===i.SHORT&&ue&&(K=ue.RGB16_SNORM_EXT),z===i.UNSIGNED_INT_5_9_9_9_REV&&(K=i.RGB9_E5),z===i.UNSIGNED_INT_10F_11F_11F_REV&&(K=i.R11F_G11F_B10F)),b===i.RGBA){let ee=ce?vs:rt.getTransfer(Z);z===i.FLOAT&&(K=i.RGBA32F),z===i.HALF_FLOAT&&(K=i.RGBA16F),z===i.UNSIGNED_BYTE&&(K=ee===ht?i.SRGB8_ALPHA8:i.RGBA8),z===i.UNSIGNED_SHORT&&ue&&(K=ue.RGBA16_EXT),z===i.SHORT&&ue&&(K=ue.RGBA16_SNORM_EXT),z===i.UNSIGNED_SHORT_4_4_4_4&&(K=i.RGBA4),z===i.UNSIGNED_SHORT_5_5_5_1&&(K=i.RGB5_A1)}return(K===i.R16F||K===i.R32F||K===i.RG16F||K===i.RG32F||K===i.RGBA16F||K===i.RGBA32F)&&e.get("EXT_color_buffer_float"),K}function S(T,b){let z;return T?b===null||b===ja||b===Dr?z=i.DEPTH24_STENCIL8:b===Ba?z=i.DEPTH32F_STENCIL8:b===Pr&&(z=i.DEPTH24_STENCIL8,Oe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===ja||b===Dr?z=i.DEPTH_COMPONENT24:b===Ba?z=i.DEPTH_COMPONENT32F:b===Pr&&(z=i.DEPTH_COMPONENT16),z}function w(T,b){return m(T)===!0||T.isFramebufferTexture&&T.minFilter!==Yt&&T.minFilter!==Ht?Math.log2(Math.max(b.width,b.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?b.mipmaps.length:1}function I(T){let b=T.target;b.removeEventListener("dispose",I),C(b),b.isVideoTexture&&u.delete(b),b.isHTMLTexture&&f.delete(b)}function _(T){let b=T.target;b.removeEventListener("dispose",_),E(b)}function C(T){let b=a.get(T);if(b.__webglInit===void 0)return;let z=T.source,W=h.get(z);if(W){let Z=W[b.__cacheKey];Z.usedTimes--,Z.usedTimes===0&&A(T),Object.keys(W).length===0&&h.delete(z)}a.remove(T)}function A(T){let b=a.get(T);i.deleteTexture(b.__webglTexture);let z=T.source,W=h.get(z);delete W[b.__cacheKey],s.memory.textures--}function E(T){let b=a.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),a.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let W=0;W<6;W++){if(Array.isArray(b.__webglFramebuffer[W]))for(let Z=0;Z<b.__webglFramebuffer[W].length;Z++)i.deleteFramebuffer(b.__webglFramebuffer[W][Z]);else i.deleteFramebuffer(b.__webglFramebuffer[W]);b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer[W])}else{if(Array.isArray(b.__webglFramebuffer))for(let W=0;W<b.__webglFramebuffer.length;W++)i.deleteFramebuffer(b.__webglFramebuffer[W]);else i.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&i.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let W=0;W<b.__webglColorRenderbuffer.length;W++)b.__webglColorRenderbuffer[W]&&i.deleteRenderbuffer(b.__webglColorRenderbuffer[W]);b.__webglDepthRenderbuffer&&i.deleteRenderbuffer(b.__webglDepthRenderbuffer)}let z=T.textures;for(let W=0,Z=z.length;W<Z;W++){let ce=a.get(z[W]);ce.__webglTexture&&(i.deleteTexture(ce.__webglTexture),s.memory.textures--),a.remove(z[W])}a.remove(T)}let F=0;function U(){F=0}function R(){return F}function B(T){F=T}function q(){let T=F;return T>=n.maxTextures&&Oe("WebGLTextures: Trying to use "+(T+1)+" texture units while this GPU supports only "+n.maxTextures),F+=1,T}function H(T){let b=[];return b.push(T.wrapS),b.push(T.wrapT),b.push(T.wrapR||0),b.push(T.magFilter),b.push(T.minFilter),b.push(T.anisotropy),b.push(T.internalFormat),b.push(T.format),b.push(T.type),b.push(T.generateMipmaps),b.push(T.premultiplyAlpha),b.push(T.flipY),b.push(T.unpackAlignment),b.push(T.colorSpace),b.join()}function te(T,b){let z=a.get(T);if(T.isVideoTexture&&D(T),T.isRenderTargetTexture===!1&&T.isExternalTexture!==!0&&T.version>0&&z.__version!==T.version){let W=T.image;if(W===null)Oe("WebGLRenderer: Texture marked for update but no image data found.");else if(W.complete===!1)Oe("WebGLRenderer: Texture marked for update but image is incomplete");else{ve(z,T,b);return}}else T.isExternalTexture&&(z.__webglTexture=T.sourceTexture?T.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,z.__webglTexture,i.TEXTURE0+b)}function Y(T,b){let z=a.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&z.__version!==T.version){ve(z,T,b);return}else T.isExternalTexture&&(z.__webglTexture=T.sourceTexture?T.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,z.__webglTexture,i.TEXTURE0+b)}function $(T,b){let z=a.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&z.__version!==T.version){ve(z,T,b);return}t.bindTexture(i.TEXTURE_3D,z.__webglTexture,i.TEXTURE0+b)}function j(T,b){let z=a.get(T);if(T.isCubeDepthTexture!==!0&&T.version>0&&z.__version!==T.version){ze(z,T,b);return}t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+b)}let Ce={[xl]:i.REPEAT,[dn]:i.CLAMP_TO_EDGE,[_l]:i.MIRRORED_REPEAT},Me={[Yt]:i.NEAREST,[em]:i.NEAREST_MIPMAP_NEAREST,[js]:i.NEAREST_MIPMAP_LINEAR,[Ht]:i.LINEAR,[Kl]:i.LINEAR_MIPMAP_NEAREST,[yn]:i.LINEAR_MIPMAP_LINEAR},Je={[im]:i.NEVER,[cm]:i.ALWAYS,[rm]:i.LESS,[Dc]:i.LEQUAL,[sm]:i.EQUAL,[Fc]:i.GEQUAL,[om]:i.GREATER,[lm]:i.NOTEQUAL};function qe(T,b){if(b.type===Ba&&e.has("OES_texture_float_linear")===!1&&(b.magFilter===Ht||b.magFilter===Kl||b.magFilter===js||b.magFilter===yn||b.minFilter===Ht||b.minFilter===Kl||b.minFilter===js||b.minFilter===yn)&&Oe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(T,i.TEXTURE_WRAP_S,Ce[b.wrapS]),i.texParameteri(T,i.TEXTURE_WRAP_T,Ce[b.wrapT]),(T===i.TEXTURE_3D||T===i.TEXTURE_2D_ARRAY)&&i.texParameteri(T,i.TEXTURE_WRAP_R,Ce[b.wrapR]),i.texParameteri(T,i.TEXTURE_MAG_FILTER,Me[b.magFilter]),i.texParameteri(T,i.TEXTURE_MIN_FILTER,Me[b.minFilter]),b.compareFunction&&(i.texParameteri(T,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(T,i.TEXTURE_COMPARE_FUNC,Je[b.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===Yt||b.minFilter!==js&&b.minFilter!==yn||b.type===Ba&&e.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||a.get(b).__currentAnisotropy){let z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(T,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,n.getMaxAnisotropy())),a.get(b).__currentAnisotropy=b.anisotropy}}}function ot(T,b){let z=!1;T.__webglInit===void 0&&(T.__webglInit=!0,b.addEventListener("dispose",I));let W=b.source,Z=h.get(W);Z===void 0&&(Z={},h.set(W,Z));let ce=H(b);if(ce!==T.__cacheKey){Z[ce]===void 0&&(Z[ce]={texture:i.createTexture(),usedTimes:0},s.memory.textures++,z=!0),Z[ce].usedTimes++;let ue=Z[T.__cacheKey];ue!==void 0&&(Z[T.__cacheKey].usedTimes--,ue.usedTimes===0&&A(b)),T.__cacheKey=ce,T.__webglTexture=Z[ce].texture}return z}function J(T,b,z){return Math.floor(Math.floor(T/z)/b)}function ae(T,b,z,W){let ce=T.updateRanges;if(ce.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,b.width,b.height,z,W,b.data);else{ce.sort((De,xe)=>De.start-xe.start);let ue=0;for(let De=1;De<ce.length;De++){let xe=ce[ue],pe=ce[De],Fe=xe.start+xe.count,Be=J(pe.start,b.width,4),Ke=J(xe.start,b.width,4);pe.start<=Fe+1&&Be===Ke&&J(pe.start+pe.count-1,b.width,4)===Be?xe.count=Math.max(xe.count,pe.start+pe.count-xe.start):(++ue,ce[ue]=pe)}ce.length=ue+1;let K=t.getParameter(i.UNPACK_ROW_LENGTH),ee=t.getParameter(i.UNPACK_SKIP_PIXELS),he=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,b.width);for(let De=0,xe=ce.length;De<xe;De++){let pe=ce[De],Fe=Math.floor(pe.start/4),Be=Math.ceil(pe.count/4),Ke=Fe%b.width,N=Math.floor(Fe/b.width),me=Be,Q=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,Ke),t.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,Ke,N,me,Q,z,W,b.data)}T.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,K),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ee),t.pixelStorei(i.UNPACK_SKIP_ROWS,he)}}function ve(T,b,z){let W=i.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(W=i.TEXTURE_2D_ARRAY),b.isData3DTexture&&(W=i.TEXTURE_3D);let Z=ot(T,b),ce=b.source;t.bindTexture(W,T.__webglTexture,i.TEXTURE0+z);let ue=a.get(ce);if(ce.version!==ue.__version||Z===!0){if(t.activeTexture(i.TEXTURE0+z),(typeof ImageBitmap<"u"&&b.image instanceof ImageBitmap)===!1){let Q=rt.getPrimaries(rt.workingColorSpace),ge=b.colorSpace===Bn?null:rt.getPrimaries(b.colorSpace),Se=b.colorSpace===Bn||Q===ge?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se)}t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment);let ee=p(b.image,!1,n.maxTextureSize);ee=ut(b,ee);let he=r.convert(b.format,b.colorSpace),De=r.convert(b.type),xe=v(b.internalFormat,he,De,b.normalized,b.colorSpace,b.isVideoTexture);qe(W,b);let pe,Fe=b.mipmaps,Be=b.isVideoTexture!==!0,Ke=ue.__version===void 0||Z===!0,N=ce.dataReady,me=w(b,ee);if(b.isDepthTexture)xe=S(b.format===ci,b.type),Ke&&(Be?t.texStorage2D(i.TEXTURE_2D,1,xe,ee.width,ee.height):t.texImage2D(i.TEXTURE_2D,0,xe,ee.width,ee.height,0,he,De,null));else if(b.isDataTexture)if(Fe.length>0){Be&&Ke&&t.texStorage2D(i.TEXTURE_2D,me,xe,Fe[0].width,Fe[0].height);for(let Q=0,ge=Fe.length;Q<ge;Q++)pe=Fe[Q],Be?N&&t.texSubImage2D(i.TEXTURE_2D,Q,0,0,pe.width,pe.height,he,De,pe.data):t.texImage2D(i.TEXTURE_2D,Q,xe,pe.width,pe.height,0,he,De,pe.data);b.generateMipmaps=!1}else Be?(Ke&&t.texStorage2D(i.TEXTURE_2D,me,xe,ee.width,ee.height),N&&ae(b,ee,he,De)):t.texImage2D(i.TEXTURE_2D,0,xe,ee.width,ee.height,0,he,De,ee.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){Be&&Ke&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,xe,Fe[0].width,Fe[0].height,ee.depth);for(let Q=0,ge=Fe.length;Q<ge;Q++)if(pe=Fe[Q],b.format!==Oa)if(he!==null)if(Be){if(N)if(b.layerUpdates.size>0){let Se=Td(pe.width,pe.height,b.format,b.type);for(let ie of b.layerUpdates){let ke=pe.data.subarray(ie*Se/pe.data.BYTES_PER_ELEMENT,(ie+1)*Se/pe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,ie,pe.width,pe.height,1,he,ke)}}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,0,pe.width,pe.height,ee.depth,he,pe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Q,xe,pe.width,pe.height,ee.depth,0,pe.data,0,0);else Oe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Be?N&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,Q,0,0,0,pe.width,pe.height,ee.depth,he,De,pe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,Q,xe,pe.width,pe.height,ee.depth,0,he,De,pe.data);b.layerUpdates.size>0&&b.clearLayerUpdates()}else{Be&&Ke&&t.texStorage2D(i.TEXTURE_2D,me,xe,Fe[0].width,Fe[0].height);for(let Q=0,ge=Fe.length;Q<ge;Q++)pe=Fe[Q],b.format!==Oa?he!==null?Be?N&&t.compressedTexSubImage2D(i.TEXTURE_2D,Q,0,0,pe.width,pe.height,he,pe.data):t.compressedTexImage2D(i.TEXTURE_2D,Q,xe,pe.width,pe.height,0,pe.data):Oe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Be?N&&t.texSubImage2D(i.TEXTURE_2D,Q,0,0,pe.width,pe.height,he,De,pe.data):t.texImage2D(i.TEXTURE_2D,Q,xe,pe.width,pe.height,0,he,De,pe.data)}else if(b.isDataArrayTexture)if(Be){if(Ke&&t.texStorage3D(i.TEXTURE_2D_ARRAY,me,xe,ee.width,ee.height,ee.depth),N)if(b.layerUpdates.size>0){let Q=Td(ee.width,ee.height,b.format,b.type);for(let ge of b.layerUpdates){let Se=ee.data.subarray(ge*Q/ee.data.BYTES_PER_ELEMENT,(ge+1)*Q/ee.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ge,ee.width,ee.height,1,he,De,Se)}b.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ee.width,ee.height,ee.depth,he,De,ee.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,xe,ee.width,ee.height,ee.depth,0,he,De,ee.data);else if(b.isData3DTexture)Be?(Ke&&t.texStorage3D(i.TEXTURE_3D,me,xe,ee.width,ee.height,ee.depth),N&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ee.width,ee.height,ee.depth,he,De,ee.data)):t.texImage3D(i.TEXTURE_3D,0,xe,ee.width,ee.height,ee.depth,0,he,De,ee.data);else if(b.isFramebufferTexture){if(Ke)if(Be)t.texStorage2D(i.TEXTURE_2D,me,xe,ee.width,ee.height);else{let Q=ee.width,ge=ee.height;for(let Se=0;Se<me;Se++)t.texImage2D(i.TEXTURE_2D,Se,xe,Q,ge,0,he,De,null),Q>>=1,ge>>=1}}else if(b.isHTMLTexture){if("texElementImage2D"in i){let Q=i.canvas;if(Q.hasAttribute("layoutsubtree")||Q.setAttribute("layoutsubtree","true"),ee.parentNode!==Q){Q.appendChild(ee),f.add(b),Q.onpaint=ge=>{let Se=ge.changedElements;for(let ie of f)Se.includes(ie.image)&&(ie.needsUpdate=!0)},Q.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ee);else{let Se=i.RGBA,ie=i.RGBA,ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Se,ie,ke,ee)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Fe.length>0){if(Be&&Ke){let Q=et(Fe[0]);t.texStorage2D(i.TEXTURE_2D,me,xe,Q.width,Q.height)}for(let Q=0,ge=Fe.length;Q<ge;Q++)pe=Fe[Q],Be?N&&t.texSubImage2D(i.TEXTURE_2D,Q,0,0,he,De,pe):t.texImage2D(i.TEXTURE_2D,Q,xe,he,De,pe);b.generateMipmaps=!1}else if(Be){if(Ke){let Q=et(ee);t.texStorage2D(i.TEXTURE_2D,me,xe,Q.width,Q.height)}N&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,he,De,ee)}else t.texImage2D(i.TEXTURE_2D,0,xe,he,De,ee);m(b)&&y(W),ue.__version=ce.version,b.onUpdate&&b.onUpdate(b)}T.__version=b.version}function ze(T,b,z){if(b.image.length!==6)return;let W=ot(T,b),Z=b.source;t.bindTexture(i.TEXTURE_CUBE_MAP,T.__webglTexture,i.TEXTURE0+z);let ce=a.get(Z);if(Z.version!==ce.__version||W===!0){t.activeTexture(i.TEXTURE0+z);let ue=rt.getPrimaries(rt.workingColorSpace),K=b.colorSpace===Bn?null:rt.getPrimaries(b.colorSpace),ee=b.colorSpace===Bn||ue===K?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);let he=b.isCompressedTexture||b.image[0].isCompressedTexture,De=b.image[0]&&b.image[0].isDataTexture,xe=[];for(let ie=0;ie<6;ie++)!he&&!De?xe[ie]=p(b.image[ie],!0,n.maxCubemapSize):xe[ie]=De?b.image[ie].image:b.image[ie],xe[ie]=ut(b,xe[ie]);let pe=xe[0],Fe=r.convert(b.format,b.colorSpace),Be=r.convert(b.type),Ke=v(b.internalFormat,Fe,Be,b.normalized,b.colorSpace),N=b.isVideoTexture!==!0,me=ce.__version===void 0||W===!0,Q=Z.dataReady,ge=w(b,pe);qe(i.TEXTURE_CUBE_MAP,b);let Se;if(he){N&&me&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ge,Ke,pe.width,pe.height);for(let ie=0;ie<6;ie++){Se=xe[ie].mipmaps;for(let ke=0;ke<Se.length;ke++){let Re=Se[ke];b.format!==Oa?Fe!==null?N?Q&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke,0,0,Re.width,Re.height,Fe,Re.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke,Ke,Re.width,Re.height,0,Re.data):Oe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?Q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke,0,0,Re.width,Re.height,Fe,Be,Re.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke,Ke,Re.width,Re.height,0,Fe,Be,Re.data)}}}else{if(Se=b.mipmaps,N&&me){Se.length>0&&ge++;let ie=et(xe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ge,Ke,ie.width,ie.height)}for(let ie=0;ie<6;ie++)if(De){N?Q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,0,0,xe[ie].width,xe[ie].height,Fe,Be,xe[ie].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,Ke,xe[ie].width,xe[ie].height,0,Fe,Be,xe[ie].data);for(let ke=0;ke<Se.length;ke++){let yt=Se[ke].image[ie].image;N?Q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke+1,0,0,yt.width,yt.height,Fe,Be,yt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke+1,Ke,yt.width,yt.height,0,Fe,Be,yt.data)}}else{N?Q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,0,0,Fe,Be,xe[ie]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0,Ke,Fe,Be,xe[ie]);for(let ke=0;ke<Se.length;ke++){let Re=Se[ke];N?Q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke+1,0,0,Fe,Be,Re.image[ie]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ie,ke+1,Ke,Fe,Be,Re.image[ie])}}}m(b)&&y(i.TEXTURE_CUBE_MAP),ce.__version=Z.version,b.onUpdate&&b.onUpdate(b)}T.__version=b.version}function we(T,b,z,W,Z,ce){let ue=r.convert(z.format,z.colorSpace),K=r.convert(z.type),ee=v(z.internalFormat,ue,K,z.normalized,z.colorSpace),he=a.get(b),De=a.get(z);if(De.__renderTarget=b,!he.__hasExternalTextures){let xe=Math.max(1,b.width>>ce),pe=Math.max(1,b.height>>ce);Z===i.TEXTURE_3D||Z===i.TEXTURE_2D_ARRAY?t.texImage3D(Z,ce,ee,xe,pe,b.depth,0,ue,K,null):t.texImage2D(Z,ce,ee,xe,pe,0,ue,K,null)}t.bindFramebuffer(i.FRAMEBUFFER,T),Ze(b)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,Z,De.__webglTexture,0,Ge(b)):(Z===i.TEXTURE_2D||Z>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Z<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,W,Z,De.__webglTexture,ce),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ve(T,b,z){if(i.bindRenderbuffer(i.RENDERBUFFER,T),b.depthBuffer){let W=b.depthTexture,Z=W&&W.isDepthTexture?W.type:null,ce=S(b.stencilBuffer,Z),ue=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Ze(b)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ge(b),ce,b.width,b.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ge(b),ce,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,ce,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,ue,i.RENDERBUFFER,T)}else{let W=b.textures;for(let Z=0;Z<W.length;Z++){let ce=W[Z],ue=r.convert(ce.format,ce.colorSpace),K=r.convert(ce.type),ee=v(ce.internalFormat,ue,K,ce.normalized,ce.colorSpace);Ze(b)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ge(b),ee,b.width,b.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ge(b),ee,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,ee,b.width,b.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function pt(T,b,z){let W=b.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,T),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Z=a.get(b.depthTexture);if(Z.__renderTarget=b,(!Z.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),W){if(Z.__webglInit===void 0&&(Z.__webglInit=!0,b.depthTexture.addEventListener("dispose",I)),Z.__webglTexture===void 0){Z.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture),qe(i.TEXTURE_CUBE_MAP,b.depthTexture);let he=r.convert(b.depthTexture.format),De=r.convert(b.depthTexture.type),xe;b.depthTexture.format===fn?xe=i.DEPTH_COMPONENT24:b.depthTexture.format===ci&&(xe=i.DEPTH24_STENCIL8);for(let pe=0;pe<6;pe++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0,xe,b.width,b.height,0,he,De,null)}}else te(b.depthTexture,0);let ce=Z.__webglTexture,ue=Ge(b),K=W?i.TEXTURE_CUBE_MAP_POSITIVE_X+z:i.TEXTURE_2D,ee=b.depthTexture.format===ci?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(b.depthTexture.format===fn)Ze(b)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ee,K,ce,0,ue):i.framebufferTexture2D(i.FRAMEBUFFER,ee,K,ce,0);else if(b.depthTexture.format===ci)Ze(b)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ee,K,ce,0,ue):i.framebufferTexture2D(i.FRAMEBUFFER,ee,K,ce,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ne(T){let b=a.get(T),z=T.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==T.depthTexture){let W=T.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),W){let Z=()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,W.removeEventListener("dispose",Z)};W.addEventListener("dispose",Z),b.__depthDisposeCallback=Z}b.__boundDepthTexture=W}if(T.depthTexture&&!b.__autoAllocateDepthBuffer)if(z)for(let W=0;W<6;W++)pt(b.__webglFramebuffer[W],T,W);else{let W=T.texture.mipmaps;W&&W.length>0?pt(b.__webglFramebuffer[0],T,0):pt(b.__webglFramebuffer,T,0)}else if(z){b.__webglDepthbuffer=[];for(let W=0;W<6;W++)if(t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[W]),b.__webglDepthbuffer[W]===void 0)b.__webglDepthbuffer[W]=i.createRenderbuffer(),Ve(b.__webglDepthbuffer[W],T,!1);else{let Z=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ce=b.__webglDepthbuffer[W];i.bindRenderbuffer(i.RENDERBUFFER,ce),i.framebufferRenderbuffer(i.FRAMEBUFFER,Z,i.RENDERBUFFER,ce)}}else{let W=T.texture.mipmaps;if(W&&W.length>0?t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=i.createRenderbuffer(),Ve(b.__webglDepthbuffer,T,!1);else{let Z=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ce=b.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ce),i.framebufferRenderbuffer(i.FRAMEBUFFER,Z,i.RENDERBUFFER,ce)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function se(T,b,z){let W=a.get(T);b!==void 0&&we(W.__webglFramebuffer,T,T.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),z!==void 0&&ne(T)}function oe(T){let b=T.texture,z=a.get(T),W=a.get(b);T.addEventListener("dispose",_);let Z=T.textures,ce=T.isWebGLCubeRenderTarget===!0,ue=Z.length>1;if(ue||(W.__webglTexture===void 0&&(W.__webglTexture=i.createTexture()),W.__version=b.version,s.memory.textures++),ce){z.__webglFramebuffer=[];for(let K=0;K<6;K++)if(b.mipmaps&&b.mipmaps.length>0){z.__webglFramebuffer[K]=[];for(let ee=0;ee<b.mipmaps.length;ee++)z.__webglFramebuffer[K][ee]=i.createFramebuffer()}else z.__webglFramebuffer[K]=i.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){z.__webglFramebuffer=[];for(let K=0;K<b.mipmaps.length;K++)z.__webglFramebuffer[K]=i.createFramebuffer()}else z.__webglFramebuffer=i.createFramebuffer();if(ue)for(let K=0,ee=Z.length;K<ee;K++){let he=a.get(Z[K]);he.__webglTexture===void 0&&(he.__webglTexture=i.createTexture(),s.memory.textures++)}if(T.samples>0&&Ze(T)===!1){z.__webglMultisampledFramebuffer=i.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let K=0;K<Z.length;K++){let ee=Z[K];z.__webglColorRenderbuffer[K]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,z.__webglColorRenderbuffer[K]);let he=r.convert(ee.format,ee.colorSpace),De=r.convert(ee.type),xe=v(ee.internalFormat,he,De,ee.normalized,ee.colorSpace,T.isXRRenderTarget===!0),pe=Ge(T);i.renderbufferStorageMultisample(i.RENDERBUFFER,pe,xe,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.RENDERBUFFER,z.__webglColorRenderbuffer[K])}i.bindRenderbuffer(i.RENDERBUFFER,null),T.depthBuffer&&(z.__webglDepthRenderbuffer=i.createRenderbuffer(),Ve(z.__webglDepthRenderbuffer,T,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ce){t.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture),qe(i.TEXTURE_CUBE_MAP,b);for(let K=0;K<6;K++)if(b.mipmaps&&b.mipmaps.length>0)for(let ee=0;ee<b.mipmaps.length;ee++)we(z.__webglFramebuffer[K][ee],T,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+K,ee);else we(z.__webglFramebuffer[K],T,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0);m(b)&&y(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ue){for(let K=0,ee=Z.length;K<ee;K++){let he=Z[K],De=a.get(he),xe=i.TEXTURE_2D;(T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(xe=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(xe,De.__webglTexture),qe(xe,he),we(z.__webglFramebuffer,T,he,i.COLOR_ATTACHMENT0+K,xe,0),m(he)&&y(xe)}t.unbindTexture()}else{let K=i.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(K=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(K,W.__webglTexture),qe(K,b),b.mipmaps&&b.mipmaps.length>0)for(let ee=0;ee<b.mipmaps.length;ee++)we(z.__webglFramebuffer[ee],T,b,i.COLOR_ATTACHMENT0,K,ee);else we(z.__webglFramebuffer,T,b,i.COLOR_ATTACHMENT0,K,0);m(b)&&y(K),t.unbindTexture()}T.depthBuffer&&ne(T)}function le(T){let b=T.textures;for(let z=0,W=b.length;z<W;z++){let Z=b[z];if(m(Z)){let ce=L(T),ue=a.get(Z).__webglTexture;t.bindTexture(ce,ue),y(ce),t.unbindTexture()}}}let de=[],Ne=[];function Ue(T){if(T.samples>0){if(Ze(T)===!1){let b=T.textures,z=T.width,W=T.height,Z=i.COLOR_BUFFER_BIT,ce=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ue=a.get(T),K=b.length>1;if(K)for(let he=0;he<b.length;he++)t.bindFramebuffer(i.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+he,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,ue.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+he,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,ue.__webglMultisampledFramebuffer);let ee=T.texture.mipmaps;ee&&ee.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ue.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ue.__webglFramebuffer);for(let he=0;he<b.length;he++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(Z|=i.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(Z|=i.STENCIL_BUFFER_BIT)),K){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,ue.__webglColorRenderbuffer[he]);let De=a.get(b[he]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,De,0)}i.blitFramebuffer(0,0,z,W,0,0,z,W,Z,i.NEAREST),l===!0&&(de.length=0,Ne.length=0,de.push(i.COLOR_ATTACHMENT0+he),T.depthBuffer&&T.storeMultisampledDepthBuffer===!1&&(de.push(ce),Ne.push(ce),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ne)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,de))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),K)for(let he=0;he<b.length;he++){t.bindFramebuffer(i.FRAMEBUFFER,ue.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+he,i.RENDERBUFFER,ue.__webglColorRenderbuffer[he]);let De=a.get(b[he]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,ue.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+he,i.TEXTURE_2D,De,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ue.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.storeMultisampledDepthBuffer===!1&&l){let b=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[b])}}}function Ge(T){return Math.min(n.maxSamples,T.samples)}function Ze(T){let b=a.get(T);return T.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}function D(T){let b=s.render.frame;u.get(T)!==b&&(u.set(T,b),T.update())}function ut(T,b){let z=T.colorSpace,W=T.format,Z=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||z!==_s&&z!==Bn&&(rt.getTransfer(z)===ht?(W!==Oa||Z!==xa)&&Oe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):He("WebGLTextures: Unsupported texture color space:",z)),b}function et(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(c.width=T.naturalWidth||T.width,c.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(c.width=T.displayWidth,c.height=T.displayHeight):(c.width=T.width,c.height=T.height),c}this.allocateTextureUnit=q,this.resetTextureUnits=U,this.getTextureUnits=R,this.setTextureUnits=B,this.setTexture2D=te,this.setTexture2DArray=Y,this.setTexture3D=$,this.setTextureCube=j,this.rebindTextures=se,this.setupRenderTarget=oe,this.updateRenderTargetMipmap=le,this.updateMultisampleRenderTarget=Ue,this.setupDepthRenderbuffer=ne,this.setupFrameBufferTexture=we,this.useMultisampledRTT=Ze,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function AS(i,e){function t(a,n=Bn){let r,s=rt.getTransfer(n);if(a===xa)return i.UNSIGNED_BYTE;if(a===$l)return i.UNSIGNED_SHORT_4_4_4_4;if(a===Ql)return i.UNSIGNED_SHORT_5_5_5_1;if(a===xd)return i.UNSIGNED_INT_5_9_9_9_REV;if(a===_d)return i.UNSIGNED_INT_10F_11F_11F_REV;if(a===md)return i.BYTE;if(a===gd)return i.SHORT;if(a===Pr)return i.UNSIGNED_SHORT;if(a===Jl)return i.INT;if(a===ja)return i.UNSIGNED_INT;if(a===Ba)return i.FLOAT;if(a===en)return i.HALF_FLOAT;if(a===vd)return i.ALPHA;if(a===bd)return i.RGB;if(a===Oa)return i.RGBA;if(a===fn)return i.DEPTH_COMPONENT;if(a===ci)return i.DEPTH_STENCIL;if(a===jl)return i.RED;if(a===ec)return i.RED_INTEGER;if(a===ui)return i.RG;if(a===tc)return i.RG_INTEGER;if(a===ac)return i.RGBA_INTEGER;if(a===eo||a===to||a===ao||a===no)if(s===ht)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(a===eo)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(a===to)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(a===ao)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(a===no)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(a===eo)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(a===to)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(a===ao)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(a===no)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(a===nc||a===ic||a===rc||a===sc)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(a===nc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(a===ic)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(a===rc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(a===sc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(a===oc||a===lc||a===cc||a===uc||a===dc||a===io||a===fc)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(a===oc||a===lc)return s===ht?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(a===cc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(a===uc)return r.COMPRESSED_R11_EAC;if(a===dc)return r.COMPRESSED_SIGNED_R11_EAC;if(a===io)return r.COMPRESSED_RG11_EAC;if(a===fc)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(a===hc||a===pc||a===mc||a===gc||a===xc||a===_c||a===vc||a===bc||a===yc||a===Sc||a===wc||a===Mc||a===Lc||a===Cc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(a===hc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(a===pc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(a===mc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(a===gc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(a===xc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(a===_c)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(a===vc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(a===bc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(a===yc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(a===Sc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(a===wc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(a===Mc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(a===Lc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(a===Cc)return s===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(a===Ic||a===Tc||a===Ac)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(a===Ic)return s===ht?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(a===Tc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(a===Ac)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(a===Ec||a===Rc||a===ro||a===Pc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(a===Ec)return r.COMPRESSED_RED_RGTC1_EXT;if(a===Rc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(a===ro)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(a===Pc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return a===Dr?i.UNSIGNED_INT_24_8:i[a]!==void 0?i[a]:null}return{convert:t}}var ES=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,RS=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Yd=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let a=new Ps(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=a}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,a=new Ia({vertexShader:ES,fragmentShader:RS,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new nt(new ia(20,20),a)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Zd=class extends hn{constructor(e,t){super();let a=this,n=null,r=1,s=null,o="local-floor",l=1,c=null,u=null,f=null,d=null,h=null,x=null,g=typeof XRWebGLBinding<"u",p=new Yd,m={},y=t.getContextAttributes(),L=null,v=null,S=[],w=[],I=new fe,_=null,C=null,A=new zt;A.viewport=new Ct;let E=new zt;E.viewport=new Ct;let F=[A,E],U=new Wl,R=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(J){let ae=S[J];return ae===void 0&&(ae=new Sr,S[J]=ae),ae.getTargetRaySpace()},this.getControllerGrip=function(J){let ae=S[J];return ae===void 0&&(ae=new Sr,S[J]=ae),ae.getGripSpace()},this.getHand=function(J){let ae=S[J];return ae===void 0&&(ae=new Sr,S[J]=ae),ae.getHandSpace()};function q(J){let ae=w.indexOf(J.inputSource);if(ae===-1)return;let ve=S[ae];ve!==void 0&&(ve.update(J.inputSource,J.frame,c||s),ve.dispatchEvent({type:J.type,data:J.inputSource}))}function H(){n.removeEventListener("select",q),n.removeEventListener("selectstart",q),n.removeEventListener("selectend",q),n.removeEventListener("squeeze",q),n.removeEventListener("squeezestart",q),n.removeEventListener("squeezeend",q),n.removeEventListener("end",H),n.removeEventListener("inputsourceschange",te);for(let J=0;J<S.length;J++){let ae=w[J];ae!==null&&(w[J]=null,S[J].disconnect(ae))}R=null,B=null,p.reset();for(let J in m)delete m[J];if(e.setRenderTarget(L),h=null,d=null,f=null,n=null,v=null,ot.stop(),a.isPresenting=!1,e.setPixelRatio(_),e.setSize(I.width,I.height,!1),C!==null){let J=C.camera;J.fov=C.fov,J.zoom=C.zoom,J.updateProjectionMatrix(),C=null}a.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(J){r=J,a.isPresenting===!0&&Oe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(J){o=J,a.isPresenting===!0&&Oe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||s},this.setReferenceSpace=function(J){c=J},this.getBaseLayer=function(){return d!==null?d:h},this.getBinding=function(){return f===null&&g&&(f=new XRWebGLBinding(n,t)),f},this.getFrame=function(){return x},this.getSession=function(){return n},this.setSession=async function(J){if(n=J,n!==null){if(L=e.getRenderTarget(),n.addEventListener("select",q),n.addEventListener("selectstart",q),n.addEventListener("selectend",q),n.addEventListener("squeeze",q),n.addEventListener("squeezestart",q),n.addEventListener("squeezeend",q),n.addEventListener("end",H),n.addEventListener("inputsourceschange",te),y.xrCompatible!==!0&&await t.makeXRCompatible(),_=e.getPixelRatio(),e.getSize(I),g&&"createProjectionLayer"in XRWebGLBinding.prototype){let ve=null,ze=null,we=null;y.depth&&(we=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ve=y.stencil?ci:fn,ze=y.stencil?Dr:ja);let Ve={colorFormat:t.RGBA8,depthFormat:we,scaleFactor:r};f=this.getBinding(),d=f.createProjectionLayer(Ve),n.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),v=new ga(d.textureWidth,d.textureHeight,{format:Oa,type:xa,depthTexture:new ai(d.textureWidth,d.textureHeight,ze,void 0,void 0,void 0,void 0,void 0,void 0,ve),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let ve={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};h=new XRWebGLLayer(n,t,ve),n.updateRenderState({baseLayer:h}),e.setPixelRatio(1),e.setSize(h.framebufferWidth,h.framebufferHeight,!1),v=new ga(h.framebufferWidth,h.framebufferHeight,{format:Oa,type:xa,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1,storeMultisampledDepthBuffer:h.ignoreDepthValues===!1,storeMultisampledStencilBuffer:h.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,s=await n.requestReferenceSpace(o),ot.setContext(n),ot.start(),a.isPresenting=!0,a.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(n!==null)return n.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function te(J){for(let ae=0;ae<J.removed.length;ae++){let ve=J.removed[ae],ze=w.indexOf(ve);ze>=0&&(w[ze]=null,S[ze].disconnect(ve))}for(let ae=0;ae<J.added.length;ae++){let ve=J.added[ae],ze=w.indexOf(ve);if(ze===-1){for(let Ve=0;Ve<S.length;Ve++)if(Ve>=w.length){w.push(ve),ze=Ve;break}else if(w[Ve]===null){w[Ve]=ve,ze=Ve;break}if(ze===-1)break}let we=S[ze];we&&we.connect(ve)}}let Y=new O,$=new O;function j(J,ae,ve){Y.setFromMatrixPosition(ae.matrixWorld),$.setFromMatrixPosition(ve.matrixWorld);let ze=Y.distanceTo($),we=ae.projectionMatrix.elements,Ve=ve.projectionMatrix.elements,pt=we[14]/(we[10]-1),ne=we[14]/(we[10]+1),se=(we[9]+1)/we[5],oe=(we[9]-1)/we[5],le=(we[8]-1)/we[0],de=(Ve[8]+1)/Ve[0],Ne=pt*le,Ue=pt*de,Ge=ze/(-le+de),Ze=Ge*-le;if(ae.matrixWorld.decompose(J.position,J.quaternion,J.scale),J.translateX(Ze),J.translateZ(Ge),J.matrixWorld.compose(J.position,J.quaternion,J.scale),J.matrixWorldInverse.copy(J.matrixWorld).invert(),we[10]===-1)J.projectionMatrix.copy(ae.projectionMatrix),J.projectionMatrixInverse.copy(ae.projectionMatrixInverse);else{let D=pt+Ge,ut=ne+Ge,et=Ne-Ze,T=Ue+(ze-Ze),b=se*ne/ut*D,z=oe*ne/ut*D;J.projectionMatrix.makePerspective(et,T,b,z,D,ut),J.projectionMatrixInverse.copy(J.projectionMatrix).invert()}}function Ce(J,ae){ae===null?J.matrixWorld.copy(J.matrix):J.matrixWorld.multiplyMatrices(ae.matrixWorld,J.matrix),J.matrixWorldInverse.copy(J.matrixWorld).invert()}this.updateCamera=function(J){if(n===null)return;let ae=J.near,ve=J.far;p.texture!==null&&(p.depthNear>0&&(ae=p.depthNear),p.depthFar>0&&(ve=p.depthFar)),U.near=E.near=A.near=ae,U.far=E.far=A.far=ve,(R!==U.near||B!==U.far)&&(n.updateRenderState({depthNear:U.near,depthFar:U.far}),R=U.near,B=U.far),U.layers.mask=J.layers.mask|6,A.layers.mask=U.layers.mask&-5,E.layers.mask=U.layers.mask&-3;let ze=J.parent,we=U.cameras;Ce(U,ze);for(let Ve=0;Ve<we.length;Ve++)Ce(we[Ve],ze);we.length===2?j(U,A,E):U.projectionMatrix.copy(A.projectionMatrix),C===null&&J.isPerspectiveCamera&&(C={camera:J,fov:J.fov,zoom:J.zoom}),Me(J,U,ze)};function Me(J,ae,ve){ve===null?J.matrix.copy(ae.matrixWorld):(J.matrix.copy(ve.matrixWorld),J.matrix.invert(),J.matrix.multiply(ae.matrixWorld)),J.matrix.decompose(J.position,J.quaternion,J.scale),J.updateMatrixWorld(!0),J.projectionMatrix.copy(ae.projectionMatrix),J.projectionMatrixInverse.copy(ae.projectionMatrixInverse),J.isPerspectiveCamera&&(J.fov=br*2*Math.atan(1/J.projectionMatrix.elements[5]),J.zoom=1)}this.getCamera=function(){return U},this.getFoveation=function(){if(!(d===null&&h===null))return l},this.setFoveation=function(J){l=J,d!==null&&(d.fixedFoveation=J),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=J)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(U)},this.getCameraTexture=function(J){return m[J]};let Je=null;function qe(J,ae){if(u=ae.getViewerPose(c||s),x=ae,u!==null){let ve=u.views;h!==null&&(e.setRenderTargetFramebuffer(v,h.framebuffer),e.setRenderTarget(v));let ze=!1;ve.length!==U.cameras.length&&(U.cameras.length=0,ze=!0);for(let ne=0;ne<ve.length;ne++){let se=ve[ne],oe=null;if(h!==null)oe=h.getViewport(se);else{let de=f.getViewSubImage(d,se);oe=de.viewport,ne===0&&(e.setRenderTargetTextures(v,de.colorTexture,de.depthStencilTexture),e.setRenderTarget(v))}let le=F[ne];le===void 0&&(le=new zt,le.layers.enable(ne),le.viewport=new Ct,F[ne]=le),le.matrix.fromArray(se.transform.matrix),le.matrix.decompose(le.position,le.quaternion,le.scale),le.projectionMatrix.fromArray(se.projectionMatrix),le.projectionMatrixInverse.copy(le.projectionMatrix).invert(),le.viewport.set(oe.x,oe.y,oe.width,oe.height),ne===0&&(U.matrix.copy(le.matrix),U.matrix.decompose(U.position,U.quaternion,U.scale)),ze===!0&&U.cameras.push(le)}let we=n.enabledFeatures;if(we&&we.includes("depth-sensing")&&n.depthUsage=="gpu-optimized"&&g){f=a.getBinding();let ne=f.getDepthInformation(ve[0]);ne&&ne.isValid&&ne.texture&&p.init(ne,n.renderState)}if(we&&we.includes("camera-access")&&g){e.state.unbindTexture(),f=a.getBinding();for(let ne=0;ne<ve.length;ne++){let se=ve[ne].camera;if(se){let oe=m[se];oe||(oe=new Ps,m[se]=oe);let le=f.getCameraImage(se);oe.sourceTexture=le}}}}for(let ve=0;ve<S.length;ve++){let ze=w[ve],we=S[ve];ze!==null&&we!==void 0&&we.update(ze,ae,c||s)}Je&&Je(J,ae),ae.detectedPlanes&&a.dispatchEvent({type:"planesdetected",data:ae}),x=null}let ot=new Wm;ot.setAnimationLoop(qe),this.setAnimationLoop=function(J){Je=J},this.dispose=function(){}}},PS=new xt,Jm=new Ye;Jm.set(-1,0,0,0,1,0,0,0,1);function DS(i,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function a(p,m){m.color.getRGB(p.fogColor.value,Ld(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function n(p,m,y,L,v){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),f(p,m)):m.isMeshPhongMaterial?(r(p,m),u(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&h(p,m,v)):m.isMeshMatcapMaterial?(r(p,m),x(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),g(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(s(p,m),m.isLineDashedMaterial&&o(p,m)):m.isPointsMaterial?l(p,m,y,L):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===Kt&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===Kt&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let y=e.get(m),L=y.envMap,v=y.envMapRotation;L&&(p.envMap.value=L,p.envMapRotation.value.setFromMatrix4(PS.makeRotationFromEuler(v)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Jm),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function s(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function o(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,y,L){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*y,p.scale.value=L*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function u(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function f(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function h(p,m,y){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Kt&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=y.texture,p.transmissionSamplerSize.value.set(y.width,y.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function x(p,m){m.matcap&&(p.matcap.value=m.matcap)}function g(p,m){let y=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(y.matrixWorld),p.nearDistance.value=y.shadow.camera.near,p.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:a,refreshMaterialUniforms:n}}function FS(i,e,t,a){let n={},r={},s=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,S){let w=S.program;a.uniformBlockBinding(v,w)}function c(v,S){let w=n[v.id];w===void 0&&(p(v),w=u(v),n[v.id]=w,v.addEventListener("dispose",y));let I=S.program;a.updateUBOMapping(v,I);let _=e.render.frame;r[v.id]!==_&&(d(v),r[v.id]=_)}function u(v){let S=f();v.__bindingPointIndex=S;let w=i.createBuffer(),I=v.__size,_=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,I,_),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,S,w),w}function f(){for(let v=0;v<o;v++)if(s.indexOf(v)===-1)return s.push(v),v;return He("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(v){let S=n[v.id],w=v.uniforms,I=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,S);for(let _=0,C=w.length;_<C;_++){let A=w[_];if(Array.isArray(A))for(let E=0,F=A.length;E<F;E++)h(A[E],_,E,I);else h(A,_,0,I)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function h(v,S,w,I){if(g(v,S,w,I)===!0){let _=v.__offset,C=v.value;if(Array.isArray(C)){let A=0;for(let E=0;E<C.length;E++){let F=C[E],U=m(F);x(F,v.__data,A),typeof F!="number"&&typeof F!="boolean"&&!F.isMatrix3&&!ArrayBuffer.isView(F)&&(A+=U.storage/Float32Array.BYTES_PER_ELEMENT)}}else x(C,v.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,_,v.__data)}}function x(v,S,w){typeof v=="number"||typeof v=="boolean"?S[0]=v:v.isMatrix3?(S[0]=v.elements[0],S[1]=v.elements[1],S[2]=v.elements[2],S[3]=0,S[4]=v.elements[3],S[5]=v.elements[4],S[6]=v.elements[5],S[7]=0,S[8]=v.elements[6],S[9]=v.elements[7],S[10]=v.elements[8],S[11]=0):ArrayBuffer.isView(v)?S.set(new v.constructor(v.buffer,v.byteOffset,S.length)):v.toArray(S,w)}function g(v,S,w,I){let _=v.value,C=S+"_"+w;if(I[C]===void 0)return typeof _=="number"||typeof _=="boolean"?I[C]=_:ArrayBuffer.isView(_)?I[C]=_.slice():I[C]=_.clone(),!0;{let A=I[C];if(typeof _=="number"||typeof _=="boolean"){if(A!==_)return I[C]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(A.equals(_)===!1)return A.copy(_),!0}}return!1}function p(v){let S=v.uniforms,w=0,I=16;for(let C=0,A=S.length;C<A;C++){let E=Array.isArray(S[C])?S[C]:[S[C]];for(let F=0,U=E.length;F<U;F++){let R=E[F],B=Array.isArray(R.value)?R.value:[R.value];for(let q=0,H=B.length;q<H;q++){let te=B[q],Y=m(te),$=w%I,j=$%Y.boundary,Ce=$+j;w+=j,Ce!==0&&I-Ce<Y.storage&&(w+=I-Ce),R.__data=new Float32Array(Y.storage/Float32Array.BYTES_PER_ELEMENT),R.__offset=w,w+=Y.storage}}}let _=w%I;return _>0&&(w+=I-_),v.__size=w,v.__cache={},this}function m(v){let S={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(S.boundary=4,S.storage=4):v.isVector2?(S.boundary=8,S.storage=8):v.isVector3||v.isColor?(S.boundary=16,S.storage=12):v.isVector4?(S.boundary=16,S.storage=16):v.isMatrix3?(S.boundary=48,S.storage=48):v.isMatrix4?(S.boundary=64,S.storage=64):v.isTexture?Oe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(v)?(S.boundary=16,S.storage=v.byteLength):Oe("WebGLRenderer: Unsupported uniform value type.",v),S}function y(v){let S=v.target;S.removeEventListener("dispose",y);let w=s.indexOf(S.__bindingPointIndex);s.splice(w,1),i.deleteBuffer(n[S.id]),delete n[S.id],delete r[S.id]}function L(){for(let v in n)i.deleteBuffer(n[v]);s=[],n={},r={}}return{bind:l,update:c,dispose:L}}var kS=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Sn=null;function US(){return Sn===null&&(Sn=new Is(kS,16,16,ui,en),Sn.name="DFG_LUT",Sn.minFilter=Ht,Sn.magFilter=Ht,Sn.wrapS=dn,Sn.wrapT=dn,Sn.generateMipmaps=!1,Sn.needsUpdate=!0),Sn}var Bc=class{constructor(e={}){let{canvas:t=dm(),context:a=null,depth:n=!0,stencil:r=!1,alpha:s=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:d=!1,outputBufferType:h=xa}=e;this.isWebGLRenderer=!0;let x;if(a!==null){if(typeof WebGLRenderingContext<"u"&&a instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=a.getContextAttributes().alpha}else x=s;let g=h,p=new Set([ac,tc,ec]),m=new Set([xa,ja,Pr,Dr,$l,Ql]),y=new Uint32Array(4),L=new Int32Array(4),v=new O,S=null,w=null,I=[],_=[],C=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Qa,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let A=this,E=!1,F=null,U=null,R=null,B=null;this._outputColorSpace=Xt;let q=0,H=0,te=null,Y=-1,$=null,j=new Ct,Ce=new Ct,Me=null,Je=new Xe(0),qe=0,ot=t.width,J=t.height,ae=1,ve=null,ze=null,we=new Ct(0,0,ot,J),Ve=new Ct(0,0,ot,J),pt=!1,ne=new wr,se=!1,oe=!1,le=new xt,de=new O,Ne=new Ct,Ue={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ge=!1;function Ze(){return te===null?ae:1}let D=a;function ut(M,k){return t.getContext(M,k)}let et,T,b,z,W,Z,ce,ue,K,ee,he,De,xe,pe,Fe,Be,Ke,N,me,Q,ge,Se,ie;try{let M={alpha:!0,depth:n,stencil:r,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"186"}`),t.addEventListener("webglcontextlost",yt,!1),t.addEventListener("webglcontextrestored",dt,!1),t.addEventListener("webglcontextcreationerror",qa,!1),D===null){let k="webgl2";if(D=ut(k,M),D===null)throw ut(k)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}ke()}catch(M){throw t.removeEventListener("webglcontextlost",yt,!1),t.removeEventListener("webglcontextrestored",dt,!1),t.removeEventListener("webglcontextcreationerror",qa,!1),He("WebGLRenderer: "+M.message),M}function ke(){et=new Gb(D),et.init(),ge=new AS(D,et),T=new Db(D,et,e,ge),b=new IS(D,et),T.reversedDepthBuffer&&d&&b.buffers.depth.setReversed(!0),U=D.createFramebuffer(),R=D.createFramebuffer(),B=D.createFramebuffer(),z=new Xb(D),W=new hS,Z=new TS(D,et,b,W,T,ge,z),ce=new Vb(A),ue=new Z0(D),Se=new Rb(D,ue),K=new Wb(D,ue,z,Se),ee=new Zb(D,K,ue,Se,z),N=new Yb(D,T,Z),Fe=new Fb(W),he=new fS(A,ce,et,T,Se,Fe),De=new DS(A,W),xe=new mS,pe=new yS(et),Ke=new Eb(A,ce,b,ee,x,l),Be=new CS(A,ee,T),ie=new FS(D,z,T,b),me=new Pb(D,et,z),Q=new qb(D,et,z),z.programs=he.programs,A.capabilities=T,A.extensions=et,A.properties=W,A.renderLists=xe,A.shadowMap=Be,A.state=b,A.info=z}g!==xa&&(C=new Jb(g,t.width,t.height,o,n,r));let Re=new Zd(A,D);this.xr=Re,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){let M=et.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){let M=et.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return ae},this.setPixelRatio=function(M){M!==void 0&&(ae=M,this.setSize(ot,J,!1))},this.getSize=function(M){return M.set(ot,J)},this.setSize=function(M,k,X=!0){if(Re.isPresenting){Oe("WebGLRenderer: Can't change size while VR device is presenting.");return}ot=M,J=k,t.width=Math.floor(M*ae),t.height=Math.floor(k*ae),X===!0&&(t.style.width=M+"px",t.style.height=k+"px"),C!==null&&C.setSize(t.width,t.height),this.setViewport(0,0,M,k)},this.getDrawingBufferSize=function(M){return M.set(ot*ae,J*ae).floor()},this.setDrawingBufferSize=function(M,k,X){ot=M,J=k,ae=X,t.width=Math.floor(M*X),t.height=Math.floor(k*X),this.setViewport(0,0,M,k)},this.setEffects=function(M){if(g===xa){He("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(M){for(let k=0;k<M.length;k++)if(M[k].isOutputPass===!0){Oe("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}C.setEffects(M||[])},this.getCurrentViewport=function(M){return M.copy(j)},this.getViewport=function(M){return M.copy(we)},this.setViewport=function(M,k,X,V){M.isVector4?we.set(M.x,M.y,M.z,M.w):we.set(M,k,X,V),b.viewport(j.copy(we).multiplyScalar(ae).round())},this.getScissor=function(M){return M.copy(Ve)},this.setScissor=function(M,k,X,V){M.isVector4?Ve.set(M.x,M.y,M.z,M.w):Ve.set(M,k,X,V),b.scissor(Ce.copy(Ve).multiplyScalar(ae).round())},this.getScissorTest=function(){return pt},this.setScissorTest=function(M){b.setScissorTest(pt=M)},this.setOpaqueSort=function(M){ve=M},this.setTransparentSort=function(M){ze=M},this.getClearColor=function(M){return M.copy(Ke.getClearColor())},this.setClearColor=function(){Ke.setClearColor(...arguments)},this.getClearAlpha=function(){return Ke.getClearAlpha()},this.setClearAlpha=function(){Ke.setClearAlpha(...arguments)},this.clear=function(M=!0,k=!0,X=!0){let V=0;if(M){let G=!1;if(te!==null){let ye=te.texture.format;G=p.has(ye)}if(G){let ye=te.texture.type,Ie=m.has(ye),be=Ke.getClearColor(),Ae=Ke.getClearAlpha(),Pe=be.r,$e=be.g,tt=be.b;Ie?(y[0]=Pe,y[1]=$e,y[2]=tt,y[3]=Ae,D.clearBufferuiv(D.COLOR,0,y)):(L[0]=Pe,L[1]=$e,L[2]=tt,L[3]=Ae,D.clearBufferiv(D.COLOR,0,L))}else V|=D.COLOR_BUFFER_BIT}k&&(V|=D.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(V|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),V!==0&&D.clear(V)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(M){M.setRenderer(this),F=M},this.dispose=function(){t.removeEventListener("webglcontextlost",yt,!1),t.removeEventListener("webglcontextrestored",dt,!1),t.removeEventListener("webglcontextcreationerror",qa,!1),Ke.dispose(),xe.dispose(),pe.dispose(),W.dispose(),ce.dispose(),ee.dispose(),Se.dispose(),ie.dispose(),he.dispose(),Re.dispose(),Re.removeEventListener("sessionstart",sh),Re.removeEventListener("sessionend",oh),bi.stop()};function yt(M){M.preventDefault(),Sd("WebGLRenderer: Context Lost."),E=!0}function dt(){Sd("WebGLRenderer: Context Restored."),E=!1;let M=z.autoReset,k=Be.enabled,X=Be.autoUpdate,V=Be.needsUpdate,G=Be.type;ke(),z.autoReset=M,Be.enabled=k,Be.autoUpdate=X,Be.needsUpdate=V,Be.type=G}function qa(M){He("WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function nn(M){let k=M.target;k.removeEventListener("dispose",nn),hx(k)}function hx(M){px(M),W.remove(M)}function px(M){let k=W.get(M).programs;k!==void 0&&(k.forEach(function(X){he.releaseProgram(X)}),M.isShaderMaterial&&he.releaseShaderCache(M))}this.renderBufferDirect=function(M,k,X,V,G,ye){k===null&&(k=Ue);let Ie=G.isMesh&&G.matrixWorld.determinantAffine()<0,be=xx(M,k,X,V,G);b.setMaterial(V,Ie);let Ae=X.index,Pe=1;if(V.wireframe===!0){if(Ae=K.getWireframeAttribute(X),Ae===void 0)return;Pe=2}let $e=X.drawRange,tt=X.attributes.position,Ee=$e.start*Pe,ft=($e.start+$e.count)*Pe;ye!==null&&(Ee=Math.max(Ee,ye.start*Pe),ft=Math.min(ft,(ye.start+ye.count)*Pe)),Ae!==null?(Ee=Math.max(Ee,0),ft=Math.min(ft,Ae.count)):tt!=null&&(Ee=Math.max(Ee,0),ft=Math.min(ft,tt.count));let Ut=ft-Ee;if(Ut<0||Ut===1/0)return;Se.setup(G,V,be,X,Ae);let wt,_t=me;if(Ae!==null&&(wt=ue.get(Ae),_t=Q,_t.setIndex(wt)),G.isMesh)V.wireframe===!0?(b.setLineWidth(V.wireframeLinewidth*Ze()),_t.setMode(D.LINES)):_t.setMode(D.TRIANGLES);else if(G.isLine){let jt=V.linewidth;jt===void 0&&(jt=1),b.setLineWidth(jt*Ze()),G.isLineSegments?_t.setMode(D.LINES):G.isLineLoop?_t.setMode(D.LINE_LOOP):_t.setMode(D.LINE_STRIP)}else G.isPoints?_t.setMode(D.POINTS):G.isSprite&&_t.setMode(D.TRIANGLES);if(G.isBatchedMesh)if(et.get("WEBGL_multi_draw"))_t.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{let jt=G._multiDrawStarts,Le=G._multiDrawCounts,ua=G._multiDrawCount,lt=Ae?ue.get(Ae).bytesPerElement:1,Da=W.get(V).currentProgram.getUniforms();for(let rn=0;rn<ua;rn++)Da.setValue(D,"_gl_DrawID",rn),_t.render(jt[rn]/lt,Le[rn])}else if(G.isInstancedMesh)_t.renderInstances(Ee,Ut,G.count);else if(X.isInstancedBufferGeometry){let jt=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,Le=Math.min(X.instanceCount,jt);_t.renderInstances(Ee,Ut,Le)}else _t.render(Ee,Ut)};function rh(M,k,X,V){F!==null&&M.isNodeMaterial&&F.setObject(V,M),se===!0&&Fe.setState(M,X,!1),M.transparent===!0&&M.side===vn&&M.forceSinglePass===!1?(M.side=Kt,M.needsUpdate=!0,Ro(M,k,V),M.side=oi,M.needsUpdate=!0,Ro(M,k,V),M.side=vn):Ro(M,k,V)}this.compile=function(M,k,X=null){X===null&&(X=M),F!==null&&F.renderStart(M,k,X),w=pe.get(X),w.init(k),_.push(w),X.traverseVisible(function(G){G.isLight&&G.layers.test(k.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),M!==X&&M.traverseVisible(function(G){G.isLight&&G.layers.test(k.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),w.setupLights(),F!==null&&F.updateLights(w.state.lightsArray),oe=this.localClippingEnabled,se=Fe.init(this.clippingPlanes,oe),se===!0&&Fe.setGlobalState(this.clippingPlanes,k),F!==null&&Be.render(w.state.shadowsArray,X,k);let V=new Set;return M.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;let ye=G.material;if(ye)if(Array.isArray(ye))for(let Ie=0;Ie<ye.length;Ie++){let be=ye[Ie];rh(be,X,k,G),V.add(be)}else rh(ye,X,k,G),V.add(ye)}),w=_.pop(),F!==null&&F.renderEnd(),V},this.compileAsync=function(M,k,X=null){let V=this.compile(M,k,X);return new Promise(G=>{function ye(){if(V.forEach(function(Ie){let Ae=W.get(Ie).currentProgram;(Ae===void 0||Ae.isReady())&&V.delete(Ie)}),V.size===0){G(M);return}setTimeout(ye,10)}et.get("KHR_parallel_shader_compile")!==null?ye():setTimeout(ye,10)})};let pu=null;function mx(M){pu&&pu(M)}function sh(){bi.stop()}function oh(){bi.start()}let bi=new Wm;bi.setAnimationLoop(mx),typeof self<"u"&&bi.setContext(self),this.setAnimationLoop=function(M){pu=M,Re.setAnimationLoop(M),M===null?bi.stop():bi.start()},Re.addEventListener("sessionstart",sh),Re.addEventListener("sessionend",oh),this.render=function(M,k){if(k!==void 0&&k.isCamera!==!0){He("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(E===!0)return;F!==null&&F.renderStart(M,k);let X=Re.enabled===!0&&Re.isPresenting===!0,V=C!==null&&(te===null||X)&&C.begin(A,te);if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),Re.enabled===!0&&Re.isPresenting===!0&&(C===null||C.isCompositing()===!1)&&(Re.cameraAutoUpdate===!0&&Re.updateCamera(k),k=Re.getCamera()),M.isScene===!0&&M.onBeforeRender(A,M,k,te),w=pe.get(M,_.length),w.init(k),w.state.textureUnits=Z.getTextureUnits(),_.push(w),le.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),ne.setFromProjectionMatrix(le,$a,k.reversedDepth),oe=this.localClippingEnabled,se=Fe.init(this.clippingPlanes,oe),S=xe.get(M,I.length),S.init(),I.push(S),Re.enabled===!0&&Re.isPresenting===!0){let Ie=A.xr.getDepthSensingMesh();Ie!==null&&mu(Ie,k,-1/0,A.sortObjects)}mu(M,k,0,A.sortObjects),S.finish(),F!==null&&F.updateLights(w.state.lightsArray),A.sortObjects===!0&&S.sort(ve,ze),Ge=Re.enabled===!1||Re.isPresenting===!1||Re.hasDepthSensing()===!1,Ge&&Ke.addToRenderList(S,M),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),se===!0&&Fe.beginShadows();let G=w.state.shadowsArray;if(Be.render(G,M,k),se===!0&&Fe.endShadows(),(V&&C.hasRenderPass())===!1){let Ie=S.opaque,be=S.transmissive;if(w.setupLights(),k.isArrayCamera){let Ae=k.cameras;if(be.length>0)for(let Pe=0,$e=Ae.length;Pe<$e;Pe++){let tt=Ae[Pe];ch(Ie,be,M,tt)}Ge&&Ke.render(M);for(let Pe=0,$e=Ae.length;Pe<$e;Pe++){let tt=Ae[Pe];lh(S,M,tt,tt.viewport)}}else be.length>0&&ch(Ie,be,M,k),Ge&&Ke.render(M),lh(S,M,k)}te!==null&&H===0&&(Z.updateMultisampleRenderTarget(te),Z.updateRenderTargetMipmap(te)),V&&C.end(A),M.isScene===!0&&M.onAfterRender(A,M,k),Se.resetDefaultState(),Y=-1,$=null,_.pop(),_.length>0?(w=_[_.length-1],Z.setTextureUnits(w.state.textureUnits),se===!0&&Fe.setGlobalState(A.clippingPlanes,w.state.camera)):w=null,I.pop(),I.length>0?S=I[I.length-1]:S=null,F!==null&&F.renderEnd()};function mu(M,k,X,V){if(M.visible===!1)return;if(M.layers.test(k.layers)){if(M.isGroup)X=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(k);else if(M.isLightProbeGrid)w.pushLightProbeGrid(M);else if(M.isLight)w.pushLight(M),M.castShadow&&w.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||M.intersectsFrustum(ne)){V&&Ne.setFromMatrixPosition(M.matrixWorld).applyMatrix4(le);let Ie=ee.update(M),be=M.material;be.visible&&S.push(M,Ie,be,X,Ne.z,null,k)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||M.intersectsFrustum(ne))){let Ie=ee.update(M),be=M.material;if(V&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Ne.copy(M.boundingSphere.center)):(Ie.boundingSphere===null&&Ie.computeBoundingSphere(),Ne.copy(Ie.boundingSphere.center)),Ne.applyMatrix4(M.matrixWorld).applyMatrix4(le)),Array.isArray(be)){let Ae=Ie.groups;for(let Pe=0,$e=Ae.length;Pe<$e;Pe++){let tt=Ae[Pe],Ee=be[tt.materialIndex];Ee&&Ee.visible&&S.push(M,Ie,Ee,X,Ne.z,tt,k)}}else be.visible&&S.push(M,Ie,be,X,Ne.z,null,k)}}let ye=M.children;for(let Ie=0,be=ye.length;Ie<be;Ie++)mu(ye[Ie],k,X,V)}function lh(M,k,X,V){let{opaque:G,transmissive:ye,transparent:Ie}=M;w.setupLightsView(X),se===!0&&Fe.setGlobalState(A.clippingPlanes,X),V&&b.viewport(j.copy(V)),G.length>0&&Eo(G,k,X),ye.length>0&&Eo(ye,k,X),Ie.length>0&&Eo(Ie,k,X),b.buffers.depth.setTest(!0),b.buffers.depth.setMask(!0),b.buffers.color.setMask(!0),b.setPolygonOffset(!1)}function ch(M,k,X,V){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[V.id]===void 0){let Ee=et.has("EXT_color_buffer_half_float")||et.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[V.id]=new ga(1,1,{generateMipmaps:!0,type:Ee?en:xa,minFilter:yn,samples:Math.max(4,T.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:rt.workingColorSpace})}let ye=w.state.transmissionRenderTarget[V.id],Ie=V.viewport||j;ye.setSize(Ie.z*A.transmissionResolutionScale,Ie.w*A.transmissionResolutionScale);let be=A.getRenderTarget(),Ae=A.getActiveCubeFace(),Pe=A.getActiveMipmapLevel();A.setRenderTarget(ye),A.getClearColor(Je),qe=A.getClearAlpha(),qe<1&&A.setClearColor(16777215,.5),A.clear(),Ge&&Ke.render(X);let $e=A.toneMapping;A.toneMapping=Qa;let tt=V.viewport;if(V.viewport!==void 0&&(V.viewport=void 0),w.setupLightsView(V),se===!0&&Fe.setGlobalState(A.clippingPlanes,V),Eo(M,X,V),Z.updateMultisampleRenderTarget(ye),Z.updateRenderTargetMipmap(ye),et.has("WEBGL_multisampled_render_to_texture")===!1){let Ee=!1;for(let ft=0,Ut=k.length;ft<Ut;ft++){let wt=k[ft],{object:_t,geometry:jt,material:Le,group:ua}=wt;if(Le.side===vn&&_t.layers.test(V.layers)){let lt=Le.side;Le.side=Kt,Le.needsUpdate=!0,uh(_t,X,V,jt,Le,ua),Le.side=lt,Le.needsUpdate=!0,Ee=!0}}Ee===!0&&(Z.updateMultisampleRenderTarget(ye),Z.updateRenderTargetMipmap(ye))}A.setRenderTarget(be,Ae,Pe),A.setClearColor(Je,qe),tt!==void 0&&(V.viewport=tt),A.toneMapping=$e}function Eo(M,k,X){let V=k.isScene===!0?k.overrideMaterial:null;for(let G=0,ye=M.length;G<ye;G++){let Ie=M[G],{object:be,geometry:Ae,group:Pe}=Ie,$e=Ie.material;$e.allowOverride===!0&&V!==null&&($e=V),be.layers.test(X.layers)&&uh(be,k,X,Ae,$e,Pe)}}function uh(M,k,X,V,G,ye){F!==null&&G.isNodeMaterial&&F.setObject(M,G),M.onBeforeRender(A,k,X,V,G,ye),M.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),G.onBeforeRender(A,k,X,V,M,ye),G.transparent===!0&&G.side===vn&&G.forceSinglePass===!1?(G.side=Kt,G.needsUpdate=!0,A.renderBufferDirect(X,k,V,G,M,ye),G.side=oi,G.needsUpdate=!0,A.renderBufferDirect(X,k,V,G,M,ye),G.side=vn):A.renderBufferDirect(X,k,V,G,M,ye),M.onAfterRender(A,k,X,V,G,ye)}function Ro(M,k,X){k.isScene!==!0&&(k=Ue);let V=W.get(M),G=w.state.lights,ye=w.state.shadowsArray,Ie=G.state.version,be=he.getParameters(M,G.state,ye,k,X,w.state.lightProbeGridArray),Ae=he.getProgramCacheKey(be),Pe=V.programs;V.environment=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?k.environment:null,V.fog=k.fog;let $e=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap;V.envMap=ce.get(M.envMap||V.environment,$e),V.envMapRotation=V.environment!==null&&M.envMap===null?k.environmentRotation:M.envMapRotation,Pe===void 0&&(M.addEventListener("dispose",nn),Pe=new Map,V.programs=Pe);let tt=Pe.get(Ae);if(tt!==void 0){if(V.currentProgram===tt&&V.lightsStateVersion===Ie)return fh(M,be),tt}else be.uniforms=he.getUniforms(M),F!==null&&M.isNodeMaterial&&F.build(M,X,be),M.onBeforeCompile(be,A),tt=he.acquireProgram(be,Ae),Pe.set(Ae,tt),V.uniforms=be.uniforms;let Ee=V.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Ee.clippingPlanes=Fe.uniform),fh(M,be),V.needsLights=vx(M),V.lightsStateVersion=Ie,V.needsLights&&(Ee.ambientLightColor.value=G.state.ambient,Ee.lightProbe.value=G.state.probe,Ee.sunLights.value=G.state.sun,Ee.sunLightShadows.value=G.state.sunShadow,Ee.directionalLights.value=G.state.directional,Ee.directionalLightShadows.value=G.state.directionalShadow,Ee.spotLights.value=G.state.spot,Ee.spotLightShadows.value=G.state.spotShadow,Ee.rectAreaLights.value=G.state.rectArea,Ee.ltc_1.value=G.state.rectAreaLTC1,Ee.ltc_2.value=G.state.rectAreaLTC2,Ee.pointLights.value=G.state.point,Ee.pointLightShadows.value=G.state.pointShadow,Ee.hemisphereLights.value=G.state.hemi,Ee.sunShadowMatrix.value=G.state.sunShadowMatrix,Ee.sunShadowCascade.value=G.state.sunShadowCascade,Ee.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ee.spotLightMatrix.value=G.state.spotLightMatrix,Ee.spotLightMap.value=G.state.spotLightMap,Ee.pointShadowMatrix.value=G.state.pointShadowMatrix),V.lightProbeGrid=w.state.lightProbeGridArray.length>0,V.currentProgram=tt,V.uniformsList=null,tt}function dh(M){if(M.uniformsList===null){let k=M.currentProgram.getUniforms();M.uniformsList=Nr.seqWithValue(k.seq,M.uniforms)}return M.uniformsList}function fh(M,k){let X=W.get(M);X.outputColorSpace=k.outputColorSpace,X.batching=k.batching,X.batchingColor=k.batchingColor,X.instancing=k.instancing,X.instancingColor=k.instancingColor,X.instancingMorph=k.instancingMorph,X.skinning=k.skinning,X.morphTargets=k.morphTargets,X.morphNormals=k.morphNormals,X.morphColors=k.morphColors,X.morphTargetsCount=k.morphTargetsCount,X.numClippingPlanes=k.numClippingPlanes,X.numIntersection=k.numClipIntersection,X.vertexAlphas=k.vertexAlphas,X.vertexTangents=k.vertexTangents,X.toneMapping=k.toneMapping}function gx(M,k){if(M.length===0)return null;if(M.length===1)return M[0].texture!==null?M[0]:null;v.setFromMatrixPosition(k.matrixWorld);for(let X=0,V=M.length;X<V;X++){let G=M[X];if(G.texture!==null&&G.boundingBox.containsPoint(v))return G}return null}function xx(M,k,X,V,G){k.isScene!==!0&&(k=Ue),Z.resetTextureUnits();let ye=k.fog,Ie=V.isMeshStandardMaterial||V.isMeshLambertMaterial||V.isMeshPhongMaterial?k.environment:null,be=te===null?A.outputColorSpace:te.isXRRenderTarget===!0?te.texture.colorSpace:rt.workingColorSpace,Ae=V.isMeshStandardMaterial||V.isMeshLambertMaterial&&!V.envMap||V.isMeshPhongMaterial&&!V.envMap,Pe=ce.get(V.envMap||Ie,Ae),$e=V.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,tt=!!X.attributes.tangent&&(!!V.normalMap||V.anisotropy>0),Ee=!!X.morphAttributes.position,ft=!!X.morphAttributes.normal,Ut=!!X.morphAttributes.color,wt=Qa;V.toneMapped&&(te===null||te.isXRRenderTarget===!0)&&(wt=A.toneMapping);let _t=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,jt=_t!==void 0?_t.length:0,Le=W.get(V),ua=w.state.lights;if(se===!0&&(oe===!0||M!==$)){let St=M===$&&V.id===Y;Fe.setState(V,M,St)}let lt=!1;V.version===Le.__version?(Le.needsLights&&Le.lightsStateVersion!==ua.state.version||Le.outputColorSpace!==be||G.isBatchedMesh&&Le.batching===!1||!G.isBatchedMesh&&Le.batching===!0||G.isBatchedMesh&&Le.batchingColor===!0&&G._colorsTexture===null||G.isBatchedMesh&&Le.batchingColor===!1&&G._colorsTexture!==null||G.isInstancedMesh&&Le.instancing===!1||!G.isInstancedMesh&&Le.instancing===!0||G.isSkinnedMesh&&Le.skinning===!1||!G.isSkinnedMesh&&Le.skinning===!0||G.isInstancedMesh&&Le.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&Le.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&Le.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&Le.instancingMorph===!1&&G.morphTexture!==null||Le.envMap!==Pe||V.fog===!0&&Le.fog!==ye||Le.numClippingPlanes!==void 0&&(Le.numClippingPlanes!==Fe.numPlanes||Le.numIntersection!==Fe.numIntersection)||Le.vertexAlphas!==$e||Le.vertexTangents!==tt||Le.morphTargets!==Ee||Le.morphNormals!==ft||Le.morphColors!==Ut||Le.toneMapping!==wt||Le.morphTargetsCount!==jt||!!Le.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(lt=!0):(lt=!0,Le.__version=V.version);let Da=Le.currentProgram;lt===!0&&(Da=Ro(V,k,G),F&&V.isNodeMaterial&&F.onUpdateProgram(V,Da,Le));let rn=!1,Wn=!1,Ki=!1,mt=Da.getUniforms(),Ft=Le.uniforms;if(b.useProgram(Da.program)&&(rn=!0,Wn=!0,Ki=!0),V.id!==Y&&(Y=V.id,Wn=!0),Le.needsLights){let St=gx(w.state.lightProbeGridArray,G);Le.lightProbeGrid!==St&&(Le.lightProbeGrid=St,Wn=!0)}if(rn||$!==M){b.buffers.depth.getReversed()&&M.reversedDepth!==!0&&(M._reversedDepth=!0,M.updateProjectionMatrix()),mt.setValue(D,"projectionMatrix",M.projectionMatrix),mt.setValue(D,"viewMatrix",M.matrixWorldInverse);let Xn=mt.map.cameraPosition;Xn!==void 0&&Xn.setValue(D,de.setFromMatrixPosition(M.matrixWorld)),T.logarithmicDepthBuffer&&mt.setValue(D,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(V.isMeshPhongMaterial||V.isMeshToonMaterial||V.isMeshLambertMaterial||V.isMeshBasicMaterial||V.isMeshStandardMaterial||V.isShaderMaterial)&&mt.setValue(D,"isOrthographic",M.isOrthographicCamera===!0),$!==M&&($=M,Wn=!0,Ki=!0)}if(Le.needsLights&&(ua.state.sunShadowMap.length>0&&mt.setValue(D,"sunShadowMap",ua.state.sunShadowMap,Z),ua.state.directionalShadowMap.length>0&&mt.setValue(D,"directionalShadowMap",ua.state.directionalShadowMap,Z),ua.state.spotShadowMap.length>0&&mt.setValue(D,"spotShadowMap",ua.state.spotShadowMap,Z),ua.state.pointShadowMap.length>0&&mt.setValue(D,"pointShadowMap",ua.state.pointShadowMap,Z)),G.isSkinnedMesh){mt.setOptional(D,G,"bindMatrix"),mt.setOptional(D,G,"bindMatrixInverse");let St=G.skeleton;St&&(St.boneTexture===null&&St.computeBoneTexture(),mt.setValue(D,"boneTexture",St.boneTexture,Z))}G.isBatchedMesh&&(mt.setOptional(D,G,"batchingTexture"),mt.setValue(D,"batchingTexture",G._matricesTexture,Z),mt.setOptional(D,G,"batchingIdTexture"),mt.setValue(D,"batchingIdTexture",G._indirectTexture,Z),mt.setOptional(D,G,"batchingColorTexture"),G._colorsTexture!==null&&mt.setValue(D,"batchingColorTexture",G._colorsTexture,Z));let qn=X.morphAttributes;if((qn.position!==void 0||qn.normal!==void 0||qn.color!==void 0)&&N.update(G,X,Da),(Wn||Le.receiveShadow!==G.receiveShadow)&&(Le.receiveShadow=G.receiveShadow,mt.setValue(D,"receiveShadow",G.receiveShadow)),(V.isMeshStandardMaterial||V.isMeshLambertMaterial||V.isMeshPhongMaterial)&&V.envMap===null&&k.environment!==null&&(Ft.envMapIntensity.value=k.environmentIntensity),Ft.dfgLUT!==void 0&&(Ft.dfgLUT.value=US()),Wn){if(mt.setValue(D,"toneMappingExposure",A.toneMappingExposure),Le.needsLights&&_x(Ft,Ki),ye&&V.fog===!0&&De.refreshFogUniforms(Ft,ye),De.refreshMaterialUniforms(Ft,V,ae,J,w.state.transmissionRenderTarget[M.id]),Le.needsLights&&Le.lightProbeGrid){let St=Le.lightProbeGrid;Ft.probesSH.value=St.texture,Ft.probesMin.value.copy(St.boundingBox.min),Ft.probesMax.value.copy(St.boundingBox.max),Ft.probesResolution.value.copy(St.resolution)}Nr.upload(D,dh(Le),Ft,Z)}if(V.isShaderMaterial&&V.uniformsNeedUpdate===!0&&(Nr.upload(D,dh(Le),Ft,Z),V.uniformsNeedUpdate=!1),V.isSpriteMaterial&&mt.setValue(D,"center",G.center),mt.setValue(D,"modelViewMatrix",G.modelViewMatrix),mt.setValue(D,"normalMatrix",G.normalMatrix),mt.setValue(D,"modelMatrix",G.matrixWorld),V.uniformsGroups!==void 0){let St=V.uniformsGroups;for(let Xn=0,Ji=St.length;Xn<Ji;Xn++){let ph=St[Xn];ie.update(ph,Da),ie.bind(ph,Da)}}return Da}function _x(M,k){M.ambientLightColor.needsUpdate=k,M.lightProbe.needsUpdate=k,M.sunLights.needsUpdate=k,M.sunLightShadows.needsUpdate=k,M.directionalLights.needsUpdate=k,M.directionalLightShadows.needsUpdate=k,M.pointLights.needsUpdate=k,M.pointLightShadows.needsUpdate=k,M.spotLights.needsUpdate=k,M.spotLightShadows.needsUpdate=k,M.rectAreaLights.needsUpdate=k,M.hemisphereLights.needsUpdate=k}function vx(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return q},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return te},this.setRenderTargetTextures=function(M,k,X){let V=W.get(M);V.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,V.__autoAllocateDepthBuffer===!1&&(V.__useRenderToTexture=!1),W.get(M.texture).__webglTexture=k,W.get(M.depthTexture).__webglTexture=V.__autoAllocateDepthBuffer?void 0:X,V.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,k){let X=W.get(M);X.__webglFramebuffer=k,X.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(M,k=0,X=0){te=M,q=k,H=X;let V=null,G=!1,ye=!1;if(M){let be=W.get(M);if(be.__useDefaultFramebuffer!==void 0){b.bindFramebuffer(D.FRAMEBUFFER,be.__webglFramebuffer),j.copy(M.viewport),Ce.copy(M.scissor),Me=M.scissorTest,b.viewport(j),b.scissor(Ce),b.setScissorTest(Me),Y=-1;return}else if(be.__webglFramebuffer===void 0)Z.setupRenderTarget(M);else if(be.__hasExternalTextures)Z.rebindTextures(M,W.get(M.texture).__webglTexture,W.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){let $e=M.depthTexture;if(be.__boundDepthTexture!==$e){if($e!==null&&W.has($e)&&(M.width!==$e.image.width||M.height!==$e.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Z.setupDepthRenderbuffer(M)}}let Ae=M.texture;(Ae.isData3DTexture||Ae.isDataArrayTexture||Ae.isCompressedArrayTexture)&&(ye=!0);let Pe=W.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Pe[k])?V=Pe[k][X]:V=Pe[k],G=!0):M.samples>0&&Z.useMultisampledRTT(M)===!1?V=W.get(M).__webglMultisampledFramebuffer:Array.isArray(Pe)?V=Pe[X]:V=Pe,j.copy(M.viewport),Ce.copy(M.scissor),Me=M.scissorTest}else j.copy(we).multiplyScalar(ae).floor(),Ce.copy(Ve).multiplyScalar(ae).floor(),Me=pt;if(X!==0&&(V=U),b.bindFramebuffer(D.FRAMEBUFFER,V)&&b.drawBuffers(M,V),b.viewport(j),b.scissor(Ce),b.setScissorTest(Me),G){let be=W.get(M.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+k,be.__webglTexture,X)}else if(ye){let be=k;for(let Ae=0;Ae<M.textures.length;Ae++){let Pe=W.get(M.textures[Ae]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+Ae,Pe.__webglTexture,X,be)}}else if(M!==null&&X!==0){let be=W.get(M.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,be.__webglTexture,X)}Y=-1};function hh(M){let k=W.get(M);return(k.__readFormat!==M.format||k.__readType!==M.type)&&(k.__readFormat=M.format,k.__readType=M.type,k.__formatReadable=T.textureFormatReadable(M.format),k.__typeReadable=T.textureTypeReadable(M.type)),k}this.readRenderTargetPixels=function(M,k,X,V,G,ye,Ie,be=0){if(!(M&&M.isWebGLRenderTarget)){He("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ae=W.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&Ie!==void 0&&(Ae=Ae[Ie]),Ae){b.bindFramebuffer(D.FRAMEBUFFER,Ae);try{let Pe=M.textures[be],$e=Pe.format,tt=Pe.type;M.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+be);let Ee=hh(Pe);if(Ee.__formatReadable===!1){He("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Ee.__typeReadable===!1){He("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=M.width-V&&X>=0&&X<=M.height-G&&D.readPixels(k,X,V,G,ge.convert($e),ge.convert(tt),ye)}finally{let Pe=te!==null?W.get(te).__webglFramebuffer:null;b.bindFramebuffer(D.FRAMEBUFFER,Pe)}}},this.readRenderTargetPixelsAsync=async function(M,k,X,V,G,ye,Ie,be=0){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ae=W.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&Ie!==void 0&&(Ae=Ae[Ie]),Ae)if(k>=0&&k<=M.width-V&&X>=0&&X<=M.height-G){b.bindFramebuffer(D.FRAMEBUFFER,Ae);let Pe=M.textures[be],$e=Pe.format,tt=Pe.type;M.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+be);let Ee=hh(Pe);if(Ee.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Ee.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let ft=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,ft),D.bufferData(D.PIXEL_PACK_BUFFER,ye.byteLength,D.STREAM_READ),D.readPixels(k,X,V,G,ge.convert($e),ge.convert(tt),0),D.bindBuffer(D.PIXEL_PACK_BUFFER,null);let Ut=te!==null?W.get(te).__webglFramebuffer:null;b.bindFramebuffer(D.FRAMEBUFFER,Ut);let wt=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await hm(D,wt,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,ft),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ye),D.bindBuffer(D.PIXEL_PACK_BUFFER,null),D.deleteBuffer(ft),D.deleteSync(wt),ye}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,k=null,X=0){let V=Math.pow(2,-X),G=Math.floor(M.image.width*V),ye=Math.floor(M.image.height*V),Ie=k!==null?k.x:0,be=k!==null?k.y:0;Z.setTexture2D(M,0),D.copyTexSubImage2D(D.TEXTURE_2D,X,0,0,Ie,be,G,ye),b.unbindTexture()},this.copyTextureToTexture=function(M,k,X=null,V=null,G=0,ye=0){let Ie,be,Ae,Pe,$e,tt,Ee,ft,Ut,wt=M.isCompressedTexture?M.mipmaps[ye]:M.image;if(X!==null)Ie=X.max.x-X.min.x,be=X.max.y-X.min.y,Ae=X.isBox3?X.max.z-X.min.z:1,Pe=X.min.x,$e=X.min.y,tt=X.isBox3?X.min.z:0;else{let Ft=Math.pow(2,-G);Ie=Math.floor(wt.width*Ft),be=Math.floor(wt.height*Ft),M.isDataArrayTexture?Ae=wt.depth:M.isData3DTexture?Ae=Math.floor(wt.depth*Ft):Ae=1,Pe=0,$e=0,tt=0}V!==null?(Ee=V.x,ft=V.y,Ut=V.z):(Ee=0,ft=0,Ut=0);let _t=ge.convert(k.format),jt=ge.convert(k.type),Le;k.isData3DTexture?(Z.setTexture3D(k,0),Le=D.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(Z.setTexture2DArray(k,0),Le=D.TEXTURE_2D_ARRAY):(Z.setTexture2D(k,0),Le=D.TEXTURE_2D),b.activeTexture(D.TEXTURE0),b.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,k.flipY),b.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),b.pixelStorei(D.UNPACK_ALIGNMENT,k.unpackAlignment);let ua=b.getParameter(D.UNPACK_ROW_LENGTH),lt=b.getParameter(D.UNPACK_IMAGE_HEIGHT),Da=b.getParameter(D.UNPACK_SKIP_PIXELS),rn=b.getParameter(D.UNPACK_SKIP_ROWS),Wn=b.getParameter(D.UNPACK_SKIP_IMAGES);b.pixelStorei(D.UNPACK_ROW_LENGTH,wt.width),b.pixelStorei(D.UNPACK_IMAGE_HEIGHT,wt.height),b.pixelStorei(D.UNPACK_SKIP_PIXELS,Pe),b.pixelStorei(D.UNPACK_SKIP_ROWS,$e),b.pixelStorei(D.UNPACK_SKIP_IMAGES,tt);let Ki=M.isDataArrayTexture||M.isData3DTexture,mt=k.isDataArrayTexture||k.isData3DTexture;if(M.isDepthTexture){let Ft=W.get(M),qn=W.get(k),St=W.get(Ft.__renderTarget),Xn=W.get(qn.__renderTarget);b.bindFramebuffer(D.READ_FRAMEBUFFER,St.__webglFramebuffer),b.bindFramebuffer(D.DRAW_FRAMEBUFFER,Xn.__webglFramebuffer);for(let Ji=0;Ji<Ae;Ji++)Ki&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,W.get(M).__webglTexture,G,tt+Ji),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,W.get(k).__webglTexture,ye,Ut+Ji)),D.blitFramebuffer(Pe,$e,Ie,be,Ee,ft,Ie,be,D.DEPTH_BUFFER_BIT,D.NEAREST);b.bindFramebuffer(D.READ_FRAMEBUFFER,null),b.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(G!==0||M.isRenderTargetTexture||W.has(M)){let Ft=W.get(M),qn=W.get(k);b.bindFramebuffer(D.READ_FRAMEBUFFER,R),b.bindFramebuffer(D.DRAW_FRAMEBUFFER,B);for(let St=0;St<Ae;St++)Ki?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Ft.__webglTexture,G,tt+St):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Ft.__webglTexture,G),mt?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,qn.__webglTexture,ye,Ut+St):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,qn.__webglTexture,ye),G!==0?D.blitFramebuffer(Pe,$e,Ie,be,Ee,ft,Ie,be,D.COLOR_BUFFER_BIT,D.NEAREST):mt?D.copyTexSubImage3D(Le,ye,Ee,ft,Ut+St,Pe,$e,Ie,be):D.copyTexSubImage2D(Le,ye,Ee,ft,Pe,$e,Ie,be);b.bindFramebuffer(D.READ_FRAMEBUFFER,null),b.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else mt?M.isDataTexture||M.isData3DTexture?D.texSubImage3D(Le,ye,Ee,ft,Ut,Ie,be,Ae,_t,jt,wt.data):k.isCompressedArrayTexture?D.compressedTexSubImage3D(Le,ye,Ee,ft,Ut,Ie,be,Ae,_t,wt.data):D.texSubImage3D(Le,ye,Ee,ft,Ut,Ie,be,Ae,_t,jt,wt):M.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ye,Ee,ft,Ie,be,_t,jt,wt.data):M.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ye,Ee,ft,wt.width,wt.height,_t,wt.data):D.texSubImage2D(D.TEXTURE_2D,ye,Ee,ft,Ie,be,_t,jt,wt);b.pixelStorei(D.UNPACK_ROW_LENGTH,ua),b.pixelStorei(D.UNPACK_IMAGE_HEIGHT,lt),b.pixelStorei(D.UNPACK_SKIP_PIXELS,Da),b.pixelStorei(D.UNPACK_SKIP_ROWS,rn),b.pixelStorei(D.UNPACK_SKIP_IMAGES,Wn),ye===0&&k.generateMipmaps&&D.generateMipmap(Le),b.unbindTexture()},this.initRenderTarget=function(M){W.get(M).__webglFramebuffer===void 0&&Z.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?Z.setTextureCube(M,0):M.isData3DTexture?Z.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?Z.setTexture2DArray(M,0):Z.setTexture2D(M,0),b.unbindTexture()},this.resetState=function(){q=0,H=0,te=null,b.reset(),Se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return $a}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=rt._getDrawingBufferColorSpace(e),t.unpackColorSpace=rt._getUnpackColorSpace()}};var uo=new O;function za(i,e,t,a,n,r){let s=2*Math.PI*n/4,o=Math.max(r-2*n,0),l=Math.PI/4;uo.copy(e),uo[a]=0,uo.normalize();let c=.5*s/(s+o),u=1-uo.angleTo(i)/l;return Math.sign(uo[t])===1?u*c:o/(s+o)+c+c*(1-u)}var Hc=class i extends _n{constructor(e=1,t=1,a=1,n=2,r=.1){let s=n*2+1;if(r=Math.min(e/2,t/2,a/2,r),super(1,1,1,s,s,s),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:a,segments:n,radius:r},s===1)return;let o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;let l=new O,c=new O,u=new O(e,t,a).divideScalar(2).subScalar(r),f=this.attributes.position.array,d=this.attributes.normal.array,h=this.attributes.uv.array,x=f.length/6,g=new O,p=.5/s;for(let m=0,y=0;m<f.length;m+=3,y+=2)switch(l.fromArray(f,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),f[m+0]=u.x*Math.sign(l.x)+c.x*r,f[m+1]=u.y*Math.sign(l.y)+c.y*r,f[m+2]=u.z*Math.sign(l.z)+c.z*r,d[m+0]=c.x,d[m+1]=c.y,d[m+2]=c.z,Math.floor(m/x)){case 0:g.set(1,0,0),h[y+0]=za(g,c,"z","y",r,a),h[y+1]=1-za(g,c,"y","z",r,t);break;case 1:g.set(-1,0,0),h[y+0]=1-za(g,c,"z","y",r,a),h[y+1]=1-za(g,c,"y","z",r,t);break;case 2:g.set(0,1,0),h[y+0]=1-za(g,c,"x","z",r,e),h[y+1]=za(g,c,"z","x",r,a);break;case 3:g.set(0,-1,0),h[y+0]=1-za(g,c,"x","z",r,e),h[y+1]=1-za(g,c,"z","x",r,a);break;case 4:g.set(0,0,1),h[y+0]=1-za(g,c,"x","y",r,e),h[y+1]=1-za(g,c,"y","x",r,t);break;case 5:g.set(0,0,-1),h[y+0]=za(g,c,"x","y",r,e),h[y+1]=1-za(g,c,"y","x",r,t);break}}static fromJSON(e){return new i(e.width,e.height,e.depth,e.segments,e.radius)}};var fo={bg:"#f4f6fa",ink:"#0b0d12",blue:"#0a6cff"},$m="NCRHomeInter, Arial, sans-serif";function Jd(i,e,t){let a=document.createElement("canvas");a.width=Math.round(i*t),a.height=Math.round(e*t);let n=a.getContext("2d");return n.scale(t,t),{c:a,ctx:n}}function We(i,e,t,a,n=13,r=500,s="#25344b",o){if(i.font=`${r} ${n}px ${$m}`,i.fillStyle=s,i.textBaseline="middle",i.textAlign="left",o&&i.measureText(e).width>o){for(;e.length&&i.measureText(e+"\u2026").width>o;)e=e.slice(0,-1);e+="\u2026"}i.fillText(e,t,a)}function Jt(i,e,t,a,n,r="#fff",s=16,o="#e1e7ef"){i.beginPath(),i.roundRect(e,t,a,n,s),i.fillStyle=r,i.fill(),i.strokeStyle=o,i.lineWidth=1,i.stroke()}function Qm(i,e,t,a,n="#e4e9f0"){i.fillStyle=n,i.fillRect(e,t,a,1)}function Gc(i,e,t,a,n,r){i.font=`600 11px ${$m}`;let s=i.measureText(e).width+20;Jt(i,t,a,s,24,r,12,r),We(i,e,t+10,a+12,11,600,n)}function Wc(i,e,t,a,n,r){let{slope:s,barW:o,barH:l,radius:c,topY:u,midY:f,midX:d,botY:h,dot:x,cut:g,yMin:p,yMax:m}=Mt,y=a/(m-p);i.save(),i.translate(e,t),i.scale(y,y),i.translate(0,-p),i.fillStyle=n;let L=(v,S,w)=>{i.save(),w&&(i.beginPath(),i.rect(-50,-50,400,500),i.moveTo(x.x+g,x.y),i.arc(x.x,x.y,g,0,Math.PI*2),i.clip("evenodd")),i.transform(1,-s,0,1,0,0),i.beginPath(),i.roundRect(S,v,o-S,l,c),i.fill(),i.restore()};L(u,0,!1),L(f,d,!0),L(h,0,!1),i.beginPath(),i.arc(x.x,x.y,x.r,0,Math.PI*2),i.fillStyle=r,i.fill(),i.restore()}function jm(i,e){let t=e?480:1024,a=e?600:640;i.fillStyle="#f4f6fa",i.fillRect(0,0,t,a);let n=e?26:40;Wc(i,n,24,35,fo.ink,"#61728c"),We(i,"NCR Suite",n+37,42,23,800),We(i,"UNE PLATEFORME \xB7 CINQ UNIVERS",n,92,e?14:16,700,"#52627a"),e||(Jt(i,40,126,944,113,"#fff",20),We(i,"Le m\xEAme socle. Votre environnement m\xE9tier.",65,166,28,700),We(i,"Des outils, un vocabulaire et des priorit\xE9s propres \xE0 chaque activit\xE9.",65,206,16,400,"#52627a")),gt.forEach((s,o)=>{let l=e?26:40+o*191,c=e?122+o*65:270;Jt(i,l,c,e?428:180,e?55:176,"#fff",15,s.accent+"30"),Jt(i,l+12,c+12,e?30:36,e?30:36,s.soft,10,s.soft),We(i,String(o+1).padStart(2,"0"),l+19,c+(e?27:30),12,700,s.accent),We(i,s.label,l+(e?57:14),c+(e?21:74),e?15:14,700,s.accent),We(i,s.nav[1]+" \xB7 "+s.nav[2],l+(e?57:14),c+(e?40:102),e?11:12,500,"#52627a",e?345:152),e||(We(i,s.nav[3],l+14,c+127,12,500,"#52627a"),Qm(i,l+14,c+155,150,s.accent+"50"))});let r=e?475:492;We(i,"LE SOCLE COMMUN",n,r,12,700,"#52627a"),Fo.forEach((s,o)=>{let l=e?26+o%3*144:40+o*159,c=e?r+20+Math.floor(o/3)*32:r+25;Jt(i,l,c,e?136:148,27,"#eaf0f7",8,"#eaf0f7"),We(i,s,l+10,c+14,e?9:11,600,"#42536a",e?116:130)}),We(i,"Illustration des univers NCR Suite \xB7 Fonctions selon l\u2019offre",n,a-20,e?10:12,400,"#63738a")}function NS(i,e,t){let a=gt[e],n=t?480:1024;i.fillStyle="#f4f6fa",i.fillRect(0,0,n,t?600:640),t||(i.fillStyle="#fff",i.fillRect(0,0,180,640),Wc(i,22,25,33,fo.ink,a.accent),We(i,"NCR Suite",60,42,19,800,fo.ink),We(i,a.label.toUpperCase(),22,88,11,700,a.accent),Jt(i,14,117,152,54,a.soft,12,a.accent+"25"),We(i,"ENVIRONNEMENT",26,134,9,600,"#63738a"),We(i,a.label,26,155,13,700,a.accent,132),a.nav.forEach((u,f)=>{f===0&&Jt(i,14,207+f*47,152,37,a.soft,9,a.accent+"35"),We(i,u,30,226+f*47,13,f===0?700:500,f===0?a.accent:"#52627a")}),Qm(i,20,526,140),We(i,"NCR Suite",25,556,13,700),We(i,"Une marque. Votre m\xE9tier.",25,578,10,400,"#63738a"));let r=t?20:204,s=t?440:796;t&&(Wc(i,20,15,28,fo.ink,a.accent),We(i,"NCR Suite",52,31,18,800),We(i,"ILLUSTRATION",358,31,10,600,"#63738a")),Jt(i,r,t?64:22,s,t?94:130,a.soft,18,a.accent+"25"),We(i,a.label.toUpperCase(),r+20,t?86:47,11,700,a.accent),We(i,a.dashboard,r+20,t?116:81,t?23:28,700,"#1c2b3d",s-40),t||(We(i,"Outils et priorit\xE9s adapt\xE9s \xE0 votre activit\xE9",r+20,117,13,400,"#52627a"),Gc(i,a.primary,760,105,a.accent,"#ffffff"));let o=172,l=t?2:4,c=(s-(l-1)*12)/l;a.metrics.forEach((u,f)=>{let d=r+f%l*(c+12),h=o+Math.floor(f/l)*70;Jt(i,d,h,c,t?60:84),We(i,u,d+14,h+20,12,600,"#63738a",c-26),We(i,"\u2014",d+14,h+(t?43:56),24,700,a.accent)})}function Vc(i,e,t,a,n,r,s=48){e.forEach((o,l)=>{Jt(i,t,a+l*s,n,s-8,l%2?"#fff":r.soft,10,r.accent+"20"),We(i,"\u203A",t+12,a+l*s+(s-8)/2,19,600,r.accent),We(i,o,t+32,a+l*s+(s-8)/2,12,600,"#33445b",n-45)})}function eg(i,e,t){let a=gt[e];NS(i,e,t);let n=t?20:204,r=t?320:278,s=t?440:490;if(Jt(i,n,r,s,t?221:324),e===0)We(i,"PARCOURS DE FORMATION",n+20,r+27,11,700,a.accent),We(i,"Pr\xE9parer. \xC9marger. Documenter.",n+20,r+56,t?19:23,700),Vc(i,["Sessions et stagiaires","Pr\xE9sences et \xE9margements","Dossiers et preuves qualit\xE9"],n+20,r+85,s-40,a,t?39:52),t||Gc(i,"Documents li\xE9s \xE0 la session",n+20,r+271,a.accent,a.soft);else if(e===1)We(i,"VACATIONS ET TERRAIN",n+20,r+27,11,700,a.accent),["Planning de vacation","Rondes QR","Main courante","Rapports terrain"].forEach((c,u)=>{let f=r+65+u*(t?39:61);i.fillStyle=a.accent+"35",i.fillRect(n+31,f,2,t?39:61),Jt(i,n+23,f-6,18,18,a.soft,9,a.accent),We(i,c,n+58,f+3,t?14:17,600),t||We(i,["Agents et sites","Points de passage","\xC9v\xE9nements consign\xE9s","Documents rattach\xE9s"][u],n+58,f+24,12,400,"#63738a")});else if(e===2)We(i,"INTERVENTIONS OP\xC9RATIONNELLES",n+20,r+27,11,700,a.accent),Vc(i,["Site \xB7 Planning et affectations","Terrain \xB7 Pointage et consignes","Preuves \xB7 Rapports et photos"],n+20,r+53,s-40,a,t?45:65),t||(Gc(i,"Avant",n+20,r+268,a.accent,a.soft),Gc(i,"Apr\xE8s",n+91,r+268,a.accent,a.soft),We(i,"Photos rattach\xE9es au site",n+170,r+280,12,500,"#63738a"));else if(e===3){We(i,"SALLE ET SERVICE",n+20,r+27,11,700,a.accent);let l=t?186:238;Jt(i,n+20,r+50,l,t?145:210,a.soft,12,a.soft);for(let c=0;c<6;c++){let u=n+37+c%2*(l/2-8),f=r+71+Math.floor(c/2)*(t?39:57);Jt(i,u,f,t?61:85,t?28:40,"#fff",8,a.accent+"50"),We(i,"Table",u+10,f+(t?14:20),11,600,a.accent)}Vc(i,["R\xE9servations","Carte et recettes","\xC9cran cuisine"],n+l+33,r+50,s-l-53,a,t?48:68),t||We(i,"Du plan de salle \xE0 la pr\xE9paration en cuisine",n+20,r+289,13,500,"#63738a")}else We(i,"AGENDA DU SALON",n+20,r+27,11,700,a.accent),["Rendez-vous","Prestation","Collaborateur"].forEach((l,c)=>{let u=r+55+c*(t?48:73);We(i,["Matin","Midi","Apr\xE8s-midi"][c],n+20,u+16,10,500,"#63738a",65),Jt(i,n+92,u,s-112,t?39:58,a.soft,10,a.accent+"30"),We(i,l,n+108,u+(t?20:22),14,600,a.accent),t||We(i,["Agenda et r\xE9servation","Services, dur\xE9es et tarifs","\xC9quipe et disponibilit\xE9s"][c],n+108,u+42,11,400,"#63738a")});if(!t){Jt(i,712,r,288,324),We(i,["SUIVI P\xC9DAGOGIQUE","SUPERVISION","QUALIT\xC9 ET STOCKS","EXPLOITATION","ACC\xC8S RAPIDES"][e],730,r+27,11,700,a.accent);let l=[["Documents de session","\xC9valuations","Attestations","Suivi qualit\xE9"],["Agents et sites","Consignes","Alertes terrain","Portail client"],["Contr\xF4les qualit\xE9","Anomalies","Stocks et produits","Rapports de passage"],["\xC9quipe et planning","Hygi\xE8ne et tra\xE7abilit\xE9","Stocks","Carte et allerg\xE8nes"],["Fiches clients","Prestations","Collaborateurs","Fid\xE9lit\xE9"]][e];Vc(i,l,730,r+53,252,a,59)}We(i,"Illustration \xB7 Fonctions selon m\xE9tier, offre et modules",t?20:204,t?577:624,t?11:12,400,"#63738a")}var $d=gt.length+1;function tg(i,e){let{c:t,ctx:a}=Jd(1024,640,e);return i===0?jm(a,!1):eg(a,i-1,!1),t}function ag(i,e){let{c:t,ctx:a}=Jd(480,600,e);return i===0?jm(a,!0):eg(a,i-1,!0),t}function ng(i){let e={};return gt.forEach((t,a)=>t.features.forEach((n,r)=>{let{c:s,ctx:o}=Jd(360,156,i);o.shadowColor=t.accent+"25",o.shadowBlur=15,o.shadowOffsetY=8,Jt(o,20,20,320,110,"#fff",18,t.accent+"30"),o.shadowColor="transparent",Wc(o,36,34,25,fo.ink,t.accent),We(o,t.label,66,47,12,700,t.accent),We(o,n,36,80,15,700,"#25344b",288),We(o,"NCR Suite \xB7 Selon l\u2019offre",36,109,11,500,"#63738a"),e[`vertical-${a}-${r}`]={canvas:s,w:360,h:156}})),e}var qc=class extends kn{constructor(){super(),this.name="RoomEnvironment",this.position.y=-3.5;let e=new _n;e.deleteAttribute("uv");let t=new Na({side:Kt}),a=new Na,n=new si(16777215,900,28,2);n.position.set(.418,16.199,.3),this.add(n);let r=new nt(e,t);r.position.set(-.757,13.219,.717),r.scale.set(31.713,28.305,28.591),this.add(r);let s=new As(e,a,6),o=new Zt;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),s.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),s.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),s.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),s.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),s.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),s.setMatrixAt(5,o.matrix),this.add(s);let l=new nt(e,zr(50));l.position.set(-16.116,14.37,8.208),l.scale.set(.1,2.428,2.739),this.add(l);let c=new nt(e,zr(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let u=new nt(e,zr(17));u.position.set(14.904,12.198,-1.832),u.scale.set(.15,4.265,6.331),this.add(u);let f=new nt(e,zr(43));f.position.set(-.462,8.89,14.52),f.scale.set(4.38,5.441,.088),this.add(f);let d=new nt(e,zr(20));d.position.set(3.235,11.486,-12.541),d.scale.set(2.5,2,.1),this.add(d);let h=new nt(e,zr(100));h.position.set(0,20,0),h.scale.set(1,.1,1),this.add(h)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function zr(i){return new qs({color:0,emissive:16777215,emissiveIntensity:i})}var Hr=(i,e,t)=>Math.min(t,Math.max(e,i)),tn=(i,e,t)=>i+(e-i)*t,sa=(i,e,t)=>{let a=Hr((t-i)/(e-i),0,1);return a*a*(3-2*a)};function ho(i,e,t,a){let n=window.devicePixelRatio||1,r=a?Math.min(n,1.25):Math.min(n,1.5),o=Math.sqrt((a?2e6:4e6)/Math.max(1,e*t));i.setPixelRatio(Math.max(1,Math.min(r,o)))}var Qd=()=>window.innerWidth<820;function Xc(i,e,t){let a=new Bc({canvas:i,antialias:!0,alpha:!0,powerPreference:"high-performance"});ho(a,window.innerWidth,window.innerHeight,e),a.toneMapping=$s,a.toneMappingExposure=1,a.setClearColor(0,0);let n=new Br(a),r=new qc,s=n.fromScene(r,.04);return r.dispose(),n.dispose(),{renderer:a,envMap:s.texture,envRT:s,envIntensity:t}}function po(i,e=256){let t=document.createElement("canvas");t.width=t.height=e;let a=t.getContext("2d"),n=a.createRadialGradient(e/2,e/2,0,e/2,e/2,e/2);i.forEach(([s,o])=>n.addColorStop(s,o)),a.fillStyle=n,a.fillRect(0,0,e,e);let r=new Nn(t);return r.colorSpace=Xt,r}function mo(i,e){let t=new Nn(i);return t.colorSpace=Xt,t.anisotropy=Math.min(4,e.capabilities.getMaxAnisotropy()),t.generateMipmaps=!0,t.minFilter=yn,t.magFilter=Ht,t}function Yc(i){i.traverse(e=>{let t=e;t.geometry&&t.geometry.dispose();let a=t.material;a&&(Array.isArray(a)?a:[a]).forEach(n=>{let r=n;r.map&&r.map.dispose(),n.dispose()})})}var BS=[{dist:10.4,az:.1,el:.15,sx:0,sy:.325,fit:.86},{dist:7,az:-.42,el:.07,sx:.18,sy:0,fit:.56},{dist:6.6,az:.5,el:.12,sx:-.18,sy:0,fit:.57},{dist:7,az:-.52,el:-.03,sx:.18,sy:0,fit:.56},{dist:6.6,az:.5,el:.14,sx:-.18,sy:0,fit:.57},{dist:10.5,az:-.22,el:.2,sx:.16,sy:0,fit:.5}],OS=[{dist:11,az:.08,el:.14,sx:0,sy:.3,fit:.92},{dist:8,az:-.3,el:.08,sx:0,sy:-.08,fit:.9},{dist:8,az:.34,el:.1,sx:0,sy:-.08,fit:.9},{dist:8,az:-.34,el:-.02,sx:0,sy:-.08,fit:.9},{dist:8,az:.34,el:.12,sx:0,sy:-.08,fit:.9},{dist:12,az:-.14,el:.16,sx:0,sy:-.07,fit:.9}],ig=256,zS=gt.flatMap((i,e)=>[{stage:e+1,key:`vertical-${e}-0`,to:[-.9,.8,.65],rot:[0,.08,0],delay:0},{stage:e+1,key:`vertical-${e}-1`,to:[.95,.05,1.1],rot:[0,-.1,0],delay:1},{stage:e+1,key:`vertical-${e}-2`,to:[-.55,-.8,1.45],rot:[0,.08,0],delay:2}]),Zc=class{constructor(e){Te(this,"o",e);Te(this,"renderer");Te(this,"scene",new kn);Te(this,"camera",new zt(32,1,1,80));Te(this,"device",new Ua);Te(this,"screenProgress",0);Te(this,"accentColor",new Xe);Te(this,"screens",[]);Te(this,"overlays",[]);Te(this,"floaters",[]);Te(this,"shadow");Te(this,"cursor");Te(this,"compact");Te(this,"devW");Te(this,"devH");Te(this,"fscale");Te(this,"intro",0);Te(this,"lastHB",0);Te(this,"frame",0);Te(this,"halo");Te(this,"envRT");Te(this,"raf",0);Te(this,"active",!0);Te(this,"s",0);Te(this,"mx",0);Te(this,"my",0);Te(this,"smx",0);Te(this,"smy",0);Te(this,"last",performance.now());Te(this,"time",0);Te(this,"w",1);Te(this,"h",1);Te(this,"eff",[]);Te(this,"ro");Te(this,"onMove",e=>{e.pointerType==="mouse"&&(this.mx=e.clientX/window.innerWidth*2-1,this.my=e.clientY/window.innerHeight*2-1)});Te(this,"onVisibility",()=>{cancelAnimationFrame(this.raf),this.raf=0,this.active&&!document.hidden&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.loop))});Te(this,"loop",e=>{if(this.raf=requestAnimationFrame(this.loop),!this.active||document.hidden){cancelAnimationFrame(this.raf),this.raf=0;return}let t=Hr((e-this.last)/1e3,0,.05);this.last=e,this.time+=t,this.intro=Math.min(1,this.intro+t/2.2);let a=1-Math.pow(1-this.intro,3);if(++this.frame%20===0){let E=this.o.getHeroBottom?.()??0;E&&Math.abs(E-this.lastHB)>1&&this.layoutHero()}let n=this.o.getProgress()*5;this.s+=(n-this.s)*(1-Math.exp(-t*5.5)),Math.abs(n-this.s)<5e-4&&(this.s=n);let r=Hr(this.s,0,5);this.smx+=(this.mx-this.smx)*(1-Math.exp(-t*3)),this.smy+=(this.my-this.smy)*(1-Math.exp(-t*3));let s=Hr(Math.floor(r),0,4),o=sa(.2,.8,r-s),l=this.eff[s],c=this.eff[s+1],u=E=>tn(l[E],c[E],o),f=u(0)+(1-a)*2.6,d=u(1)+this.smx*.09+(1-a)*.3,h=u(2)-this.smy*.045,x=Math.cos(h);this.camera.position.set(f*Math.sin(d)*x,f*Math.sin(h),f*Math.cos(d)*x),this.camera.lookAt(0,0,0),this.camera.setViewOffset(this.w,this.h,-u(3)*this.w,-u(4)*this.h,this.w,this.h);let g=Math.sin(this.time*.9)*.05;this.device.position.y=g-(1-a)*.35,this.device.rotation.x=Math.sin(this.time*.6)*.012,this.device.rotation.z=Math.sin(this.time*.5)*.006,this.shadow.position.y=-(this.devH/2+.78)-g*.5,this.shadow.material.opacity=.9-g*2;let p=r<.45?this.o.getHeroView():r;this.screenProgress+=(p-this.screenProgress)*(1-Math.exp(-t*9)),this.overlays.forEach((E,F)=>{let U=F+1;E.opacity=sa(U-.6,U-.4,this.screenProgress)});let m=0;this.overlays.forEach((E,F)=>{E.opacity>=1&&(m=F+1)}),this.screens.forEach((E,F)=>{E.visible=F===m||F>m&&E.material.opacity>0});let y=r<.45?this.o.getHeroView()-1:Math.round(r)-1,L=this.accentColor.set(gt[y]?.accent??"#61728c");this.halo.material.color.lerp(L,1-Math.exp(-t*4));for(let E of this.floaters){let F=Math.abs(r-E.def.stage),U=1-sa(.3,.78,F);if(U=sa(E.def.delay*.12,1,U),E.mesh.visible=U>.004,!E.mesh.visible)continue;let R=1-Math.pow(1-U,3),B=E.to[2]*R;E.mesh.position.set(tn(E.from[0],E.to[0],R)+this.smx*.11*B,tn(E.from[1],E.to[1],R)-this.smy*.06*B+Math.sin(this.time*1.1+E.def.delay*1.7)*.03*U,tn(E.from[2],E.to[2],R)),E.mesh.rotation.set(E.def.rot[0]*R,E.def.rot[1]*R,E.def.rot[2]*R),E.mesh.scale.setScalar(tn(.9,1,R)*this.fscale),E.mat.opacity=Hr(U*1.15,0,1)}let v=[[-1.77,.8],[-.83,.5],[1.61,1.12],[1.3,-.1],[.3,-.42],[-1.77,.45]],S=this.time*.26,w=Math.floor(S)%v.length,I=sa(0,.55,S-Math.floor(S)),_=v[w],C=v[(w+1)%v.length];this.cursor.position.x=tn(_[0],C[0],I),this.cursor.position.y=tn(_[1],C[1],I)+Math.sin(I*Math.PI)*.12;let A=this.cursor.material;A.opacity=(1-sa(.35,.9,r))*sa(.5,1.6,this.time),this.cursor.visible=!this.compact&&A.opacity>.01,this.halo.position.x=tn(0,-.3,sa(0,5,r)),this.renderer.render(this.scene,this.camera),this.o.onFrame(r)});let t=e.views[0];this.compact=t.height>t.width,this.devW=this.compact?3.04:4.22,this.devH=this.compact?3.74:2.74,this.fscale=this.compact?.8:1;let{renderer:a,envMap:n,envRT:r}=Xc(e.canvas,e.mobile,.9);this.renderer=a,this.envRT=r,this.scene.environment=n,this.scene.environmentIntensity=.85,this.build(),this.resize(),this.ro=new ResizeObserver(()=>this.resize()),this.ro.observe(e.canvas),e.mobile||window.addEventListener("pointermove",this.onMove,{passive:!0}),document.addEventListener("visibilitychange",this.onVisibility),this.onVisibility()}build(){let{renderer:e,scene:t,device:a}={renderer:this.renderer,scene:this.scene,device:this.device},n=this.o.mobile,r=new Ri(16777215,1.6);r.position.set(3,5,6),t.add(r),t.add(new Pi(16777215,.35));let s=po([[0,"rgba(255,255,255,0.22)"],[.5,"rgba(255,255,255,0.07)"],[1,"rgba(255,255,255,0)"]]);this.halo=new nt(new ia(14,14),new na({map:s,transparent:!0,depthWrite:!1,toneMapped:!1})),this.halo.position.z=-1.6,this.halo.renderOrder=-2,t.add(this.halo);let o=po([[0,"rgba(20,30,60,0.34)"],[.6,"rgba(20,30,60,0.08)"],[1,"rgba(20,30,60,0)"]]);this.shadow=new nt(new ia(6.4*this.devW/4.22,2.6*this.devW/4.22),new na({map:o,transparent:!0,depthWrite:!1,toneMapped:!1})),this.shadow.rotation.x=-Math.PI/2,this.shadow.position.set(0,-(this.devH/2+.78),0),this.shadow.renderOrder=-1,t.add(this.shadow);let l=new nt(new Hc(this.devW,this.devH,.12,n?4:5,this.compact?.17:.07),new Na({color:1711396,metalness:.92,roughness:.3}));a.add(l);let c=new nt(new ia(this.devW-.1,this.devH-.1),new Na({color:131845,metalness:.2,roughness:.18}));c.position.z=.0615,a.add(c),this.o.views.forEach((S,w)=>{let I=mo(S,e),_=new na({map:I,toneMapped:!1,transparent:w>0,opacity:w>0?0:1,depthWrite:w===0}),C=new nt(new ia(this.devW-.22,this.devH-.24),_);C.position.z=.0625+w*4e-4,C.renderOrder=w,a.add(C),this.screens.push(C),w>0&&this.overlays.push(_)});let u=document.createElement("canvas");u.width=256,u.height=160;let f=u.getContext("2d"),d=f.createLinearGradient(0,0,256,160);d.addColorStop(0,"rgba(255,255,255,0.16)"),d.addColorStop(.35,"rgba(255,255,255,0.03)"),d.addColorStop(.5,"rgba(255,255,255,0)"),d.addColorStop(1,"rgba(255,255,255,0.05)"),f.fillStyle=d,f.fillRect(0,0,256,160);let h=new nt(new ia(this.devW-.22,this.devH-.24),new na({map:new Nn(u),transparent:!0,depthWrite:!1,toneMapped:!1}));h.position.z=.0675,h.renderOrder=20,a.add(h);let x=document.createElement("canvas");x.width=x.height=128;let g=x.getContext("2d");g.translate(22,14),g.scale(3.2,3.2),g.beginPath(),g.moveTo(0,0),g.lineTo(0,15.5),g.lineTo(4,12),g.lineTo(6.9,18.6),g.lineTo(9.3,17.5),g.lineTo(6.5,11.2),g.lineTo(11.8,11.2),g.closePath(),g.shadowColor="rgba(0,0,0,0.35)",g.shadowBlur=8,g.shadowOffsetY=3,g.fillStyle="#0b0d12",g.fill(),g.shadowColor="transparent",g.lineWidth=1.4,g.strokeStyle="#ffffff",g.lineJoin="round",g.stroke();let p=new Nn(x);p.colorSpace=Xt,this.cursor=new nt(new ia(.3,.3),new na({map:p,transparent:!0,depthWrite:!1,toneMapped:!1})),this.cursor.position.z=.072,this.cursor.renderOrder=25,this.cursor.geometry.translate(.098,-.117,0),a.add(this.cursor);let m=ng(n?2:3),y=this.compact?.72:n?.8:1,L=this.compact?1.45:1,v=this.compact?.9:1;zS.forEach(S=>{let w=m[S.key],I=new na({map:mo(w.canvas,e),transparent:!0,opacity:0,depthWrite:!1,toneMapped:!1}),_=new nt(new ia(w.w/ig,w.h/ig),I);_.visible=!1,_.renderOrder=30+S.stage;let C=[S.to[0]*y,S.to[1]*L,S.to[2]*v];a.add(_),this.floaters.push({def:S,mesh:_,mat:I,to:C,from:[C[0]*.85,C[1]*.85,.09]})}),t.add(a)}resize(){let e=this.o.canvas,t=e.clientWidth||1,a=e.clientHeight||1;this.w=t,this.h=a,ho(this.renderer,t,a,this.o.mobile),this.renderer.setSize(t,a,!1),this.camera.aspect=t/a;let n=window.innerWidth<1024,r=n?OS:BS,s=Math.tan(Fr.degToRad(this.camera.fov/2));this.eff=r.map(o=>[Math.max(o.dist,(this.devW-.02)/(o.fit*2*s*this.camera.aspect),n?this.devH/(.58*2*s):0),o.az,o.el,o.sx,o.sy]),this.layoutHero(n,s),this.camera.updateProjectionMatrix()}layoutHero(e=window.innerWidth<1024,t=Math.tan(Fr.degToRad(this.camera.fov/2))){let{w:a,h:n}=this,r=this.o.getHeroBottom?.()??0;if(!r||!this.eff.length)return;this.lastHB=r;let s=r+(e?22:30),o=Math.max(120,n-s-(e?14:0)),l=e?.97*a:.74*a,c=Math.max(50,Math.min(this.compact?o*.93/this.devH:o/.6/this.devH,l/this.devW)),u=this.devH*c,f=n/(2*t*c),d=u<=o*.9?s+o/2:s+u/2;this.eff[0]=[f,.1,.15,0,(d-n/2)/n]}setActive(e){this.active!==e&&(this.active=e,this.onVisibility())}dispose(){cancelAnimationFrame(this.raf),document.removeEventListener("visibilitychange",this.onVisibility),this.ro.disconnect(),window.removeEventListener("pointermove",this.onMove),Yc(this.scene),this.envRT.dispose(),this.renderer.dispose(),this.renderer.forceContextLoss()}};var jd=[Si,Tn,Fa,on,wi];function Kc({active:i,onChange:e,label:t="Choisir un univers m\xE9tier",overview:a=!0}){return re("div",{className:"vertical-selector",role:"group","aria-label":t,children:[a&&re("button",{type:"button","aria-pressed":i===-1,onClick:()=>e(-1),className:"vertical-choice",style:{"--choice-accent":"#25344b","--choice-soft":"#eef2f7"},children:[P(sn,{size:15,"aria-hidden":"true"}),P("span",{children:"NCR Suite"})]}),gt.map((n,r)=>{let s=jd[r];return re("button",{type:"button","aria-pressed":i===r,onClick:()=>e(r),className:"vertical-choice",style:{"--choice-accent":n.accent,"--choice-soft":n.soft},children:[P(s,{size:15,"aria-hidden":"true"}),P("span",{children:n.label})]},n.key)})]})}function On(i){if(i===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return i}function hg(i,e){i.prototype=Object.create(e.prototype),i.prototype.constructor=i,i.__proto__=e}var ya={autoSleep:120,force3D:"auto",nullTargetWarn:1,units:{lineHeight:""}},yo={duration:.5,overwrite:!1,delay:0},_f,$t,It,Va=1e8,bt=1/Va,lf=Math.PI*2,HS=lf/4,VS=0,pg=Math.sqrt,GS=Math.cos,WS=Math.sin,Wt=function(e){return typeof e=="string"},Pt=function(e){return typeof e=="function"},Hn=function(e){return typeof e=="number"},ru=function(e){return typeof e>"u"},Cn=function(e){return typeof e=="object"},ba=function(e){return e!==!1},vf=function(){return typeof window<"u"},Jc=function(e){return Pt(e)||Wt(e)},mg=typeof ArrayBuffer=="function"&&ArrayBuffer.isView||function(){},la=Array.isArray,qS=/random\([^)]+\)/g,XS=/,\s*/g,rg=/(?:-?\.?\d|\.)+/gi,bf=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,Hi=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,ef=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,yf=/[+-]=-?[.\d]+/,YS=/[^,'"\[\]\s]+/gi,ZS=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,Et,Mn,cf,Sf,Ea={},eu={},gg,xg=function(e){return(eu=Gr(e,Ea))&&ca},su=function(e,t){return console.warn("Invalid property",e,"set to",t,"Missing plugin? gsap.registerPlugin()")},So=function(e,t){return!t&&console.warn(e)},_g=function(e,t){return e&&(Ea[e]=t)&&eu&&(eu[e]=t)||Ea},wo=function(){return 0},KS={suppressEvents:!0,isStart:!0,kill:!1},$c={suppressEvents:!0,kill:!1},JS={suppressEvents:!0},wf={},fi=[],uf={},vg,_a={},tf={},sg=30,Qc=[],Mf="",Lf=function(e){var t=e[0],a,n;if(Cn(t)||Pt(t)||(e=[e]),!(a=(t._gsap||{}).harness)){for(n=Qc.length;n--&&!Qc[n].targetTest(t););a=Qc[n]}for(n=e.length;n--;)e[n]&&(e[n]._gsap||(e[n]._gsap=new Af(e[n],a)))||e.splice(n,1);return e},hi=function(e){return e._gsap||Lf(Ga(e))[0]._gsap},Cf=function(e,t,a){return(a=e[t])&&Pt(a)?e[t]():ru(a)&&e.getAttribute&&e.getAttribute(t)||a},pa=function(e,t){return(e=e.split(",")).forEach(t)||e},Dt=function(e){return Math.round(e*1e5)/1e5||0},At=function(e){return Math.round(e*1e7)/1e7||0},Vi=function(e,t){var a=t.charAt(0),n=parseFloat(t.substr(2));return e=parseFloat(e),a==="+"?e+n:a==="-"?e-n:a==="*"?e*n:e/n},$S=function(e,t){for(var a=t.length,n=0;e.indexOf(t[n])<0&&++n<a;);return n<a},tu=function(){var e=fi.length,t=fi.slice(0),a,n;for(uf={},fi.length=0,a=0;a<e;a++)n=t[a],n&&n._lazy&&(n.render(n._lazy[0],n._lazy[1],!0)._lazy=0)},If=function(e){return!!(e._initted||e._startAt||e.add)},bg=function(e,t,a,n){fi.length&&!$t&&tu(),e.render(t,a,n||!!($t&&t<0&&If(e))),fi.length&&!$t&&tu()},yg=function(e){var t=parseFloat(e);return(t||t===0)&&(e+"").match(YS).length<2?t:Wt(e)?e.trim():e},Sg=function(e){return e},Ra=function(e,t){for(var a in t)a in e||(e[a]=t[a]);return e},QS=function(e){return function(t,a){for(var n in a)n in t||n==="duration"&&e||n==="ease"||(t[n]=a[n])}},Gr=function(e,t){for(var a in t)e[a]=t[a];return e},og=function i(e,t){for(var a in t)a!=="__proto__"&&a!=="constructor"&&a!=="prototype"&&(e[a]=Cn(t[a])?i(e[a]||(e[a]={}),t[a]):t[a]);return e},au=function(e,t){var a={},n;for(n in e)n in t||(a[n]=e[n]);return a},_o=function(e){var t=e.parent||Et,a=e.keyframes?QS(la(e.keyframes)):Ra;if(ba(e.inherit))for(;t;)a(e,t.vars.defaults),t=t.parent||t._dp;return e},jS=function(e,t){for(var a=e.length,n=a===t.length;n&&a--&&e[a]===t[a];);return a<0},wg=function(e,t,a,n,r){a===void 0&&(a="_first"),n===void 0&&(n="_last");var s=e[n],o;if(r)for(o=t[r];s&&s[r]>o;)s=s._prev;return s?(t._next=s._next,s._next=t):(t._next=e[a],e[a]=t),t._next?t._next._prev=t:e[n]=t,t._prev=s,t.parent=t._dp=e,t},ou=function(e,t,a,n){a===void 0&&(a="_first"),n===void 0&&(n="_last");var r=t._prev,s=t._next;r?r._next=s:e[a]===t&&(e[a]=s),s?s._prev=r:e[n]===t&&(e[n]=r),t._next=t._prev=t.parent=null},pi=function(e,t){e.parent&&(!t||e.parent.autoRemoveChildren)&&e.parent.remove&&e.parent.remove(e),e._act=0},Bi=function(e,t){if(e&&(!t||t._end>e._dur||t._start<0))for(var a=e;a;)a._dirty=1,a=a.parent;return e},ew=function(e){for(var t=e.parent;t&&t.parent;)t._dirty=1,t.totalDuration(),t=t.parent;return e},df=function(e,t,a,n){return e._startAt&&($t?e._startAt.revert($c):e.vars.immediateRender&&!e.vars.autoRevert||e._startAt.render(t,!0,n))},tw=function i(e){return!e||e._ts&&i(e.parent)},lg=function(e){return e._repeat?Wr(e._tTime,e=e.duration()+e._rDelay)*e:0},Wr=function(e,t){var a=Math.floor(e=At(e/t));return e&&a===e?a-1:a},nu=function(e,t){return(e-t._start)*t._ts+(t._ts>=0?0:t._dirty?t.totalDuration():t._tDur)},lu=function(e){return e._end=At(e._start+(e._tDur/Math.abs(e._ts||e._rts||bt)||0))},cu=function(e,t){var a=e._dp;return a&&a.smoothChildTiming&&e._ts&&(e._start=At(a._time-(e._ts>0?t/e._ts:((e._dirty?e.totalDuration():e._tDur)-t)/-e._ts)),lu(e),a._dirty||Bi(a,e)),e},Mg=function(e,t){var a;if((t._time||!t._dur&&t._initted||t._start<e._time&&(t._dur||!t.add))&&(a=nu(e.rawTime(),t),(!t._dur||Co(0,t.totalDuration(),a)-t._tTime>bt)&&t.render(a,!0)),Bi(e,t)._dp&&e._initted&&e._time>=e._dur&&e._ts){if(e._dur<e.duration())for(a=e;a._dp;)a.rawTime()>=0&&a.totalTime(a._tTime),a=a._dp;e._zTime=-bt}},Ln=function(e,t,a,n){return t.parent&&pi(t),t._start=At((Hn(a)?a:a||e!==Et?Ha(e,a,t):e._time)+t._delay),t._end=At(t._start+(t.totalDuration()/Math.abs(t.timeScale())||0)),wg(e,t,"_first","_last",e._sort?"_start":0),ff(t)||(e._recent=t),n||Mg(e,t),e._ts<0&&cu(e,e._tTime),e},Lg=function(e,t){return(Ea.ScrollTrigger||su("scrollTrigger",t))&&Ea.ScrollTrigger.create(t,e)},Cg=function(e,t,a,n,r){if(Pf(e,t,r),!e._initted)return 1;if(!a&&e._pt&&!$t&&(e._dur&&e.vars.lazy!==!1||!e._dur&&e.vars.lazy)&&vg!==va.frame)return fi.push(e),e._lazy=[r,n],1},aw=function i(e){var t=e.parent;return t&&t._ts&&t._initted&&!t._lock&&(t.rawTime()<0||i(t))},ff=function(e){var t=e.data;return t==="isFromStart"||t==="isStart"},nw=function(e,t,a,n){var r=e.ratio,s=t<0||!t&&(!e._start&&aw(e)&&!(!e._initted&&ff(e))||(e._ts<0||e._dp._ts<0)&&!ff(e))?0:1,o=e._rDelay,l=0,c,u,f;if(o&&e._repeat&&(l=Co(0,e._tDur,t),u=Wr(l,o),e._yoyo&&u&1&&(s=1-s),u!==Wr(e._tTime,o)&&(r=1-s,e.vars.repeatRefresh&&e._initted&&e.invalidate())),s!==r||$t||n||e._zTime===bt||!t&&e._zTime){if(!e._initted&&Cg(e,t,n,a,l))return;for(f=e._zTime,e._zTime=t||(a?bt:0),a||(a=t&&!f),e.ratio=s,e._from&&(s=1-s),e._time=0,e._tTime=l,c=e._pt;c;)c.r(s,c.d),c=c._next;t<0&&df(e,t,a,!0),e._onUpdate&&!a&&Aa(e,"onUpdate"),l&&e._repeat&&!a&&e.parent&&Aa(e,"onRepeat"),(t>=e._tDur||t<0)&&e.ratio===s&&(s&&pi(e,1),!a&&!$t&&(Aa(e,s?"onComplete":"onReverseComplete",!0),e._prom&&e._prom()))}else e._zTime||(e._zTime=t)},iw=function(e,t,a){var n;if(a>t)for(n=e._first;n&&n._start<=a;){if(n.data==="isPause"&&n._start>t)return n;n=n._next}else for(n=e._last;n&&n._start>=a;){if(n.data==="isPause"&&n._start<t)return n;n=n._prev}},qr=function(e,t,a,n){var r=e._repeat,s=At(t)||0,o=e._tTime/e._tDur;return o&&!n&&(e._time*=s/e._dur),e._dur=s,e._tDur=r?r<0?1e10:At(s*(r+1)+e._rDelay*r):s,o>0&&!n&&cu(e,e._tTime=e._tDur*o),e.parent&&lu(e),a||Bi(e.parent,e),e},cg=function(e){return e instanceof oa?Bi(e):qr(e,e._dur)},rw={_start:0,endTime:wo,totalDuration:wo},Ha=function i(e,t,a){var n=e.labels,r=e._recent||rw,s=e.duration()>=Va?r.endTime(!1):e._dur,o,l,c;return Wt(t)&&(isNaN(t)||t in n)?(l=t.charAt(0),c=t.substr(-1)==="%",o=t.indexOf("="),l==="<"||l===">"?(o>=0&&(t=t.replace(/=/,"")),(l==="<"?r._start:r.endTime(r._repeat>=0))+(parseFloat(t.substr(1))||0)*(c?(o<0?r:a).totalDuration()/100:1)):o<0?(t in n||(n[t]=s),n[t]):(l=parseFloat(t.charAt(o-1)+t.substr(o+1)),c&&a&&(l=l/100*(la(a)?a[0]:a).totalDuration()),o>1?i(e,t.substr(0,o-1),a)+l:s+l)):t==null?s:+t},vo=function(e,t,a){var n=Hn(t[1]),r=(n?2:1)+(e<2?0:1),s=t[r],o,l;if(n&&(s.duration=t[1]),s.parent=a,e){for(o=s,l=a;l&&!("immediateRender"in o);)o=l.vars.defaults||{},l=ba(l.vars.inherit)&&l.parent;s.immediateRender=ba(o.immediateRender),e<2?s.runBackwards=1:s.startAt=t[r-1]}return new kt(t[0],s,t[r+1])},mi=function(e,t){return e||e===0?t(e):t},Co=function(e,t,a){return a<e?e:a>t?t:a},Qt=function(e,t){return!Wt(e)||!(t=ZS.exec(e))?"":t[1]},sw=function(e,t,a){return mi(a,function(n){return Co(e,t,n)})},hf=[].slice,Ig=function(e,t){return e&&Cn(e)&&"length"in e&&(!t&&!e.length||e.length-1 in e&&Cn(e[0]))&&!e.nodeType&&e!==Mn},ow=function(e,t,a){return a===void 0&&(a=[]),e.forEach(function(n){var r;return Wt(n)&&!t||Ig(n,1)?(r=a).push.apply(r,Ga(n)):a.push(n)})||a},Ga=function(e,t,a){return It&&!t&&It.selector?It.selector(e):Wt(e)&&!a&&(cf||!Xr())?hf.call((t||Sf).querySelectorAll(e),0):la(e)?ow(e,a):Ig(e)?hf.call(e,0):e?[e]:[]},pf=function(e){return e=Ga(e)[0]||So("Invalid scope")||{},function(t){var a=e.current||e.nativeElement||e;return Ga(t,a.querySelectorAll?a:a===e?So("Invalid scope")||Sf.createElement("div"):e)}},Tg=function(e){return e.sort(function(){return .5-Math.random()})},Ag=function(e){if(Pt(e))return e;var t=Cn(e)?e:{each:e},a=Oi(t.ease),n=t.from||0,r=parseFloat(t.base)||0,s={},o=n>0&&n<1,l=isNaN(n)||o,c=t.axis,u=n,f=n;return Wt(n)?u=f={center:.5,edges:.5,end:1}[n]||0:!o&&l&&(u=n[0],f=n[1]),function(d,h,x){var g=(x||t).length,p=s[g],m,y,L,v,S,w,I,_,C;if(!p){if(C=t.grid==="auto"?0:(t.grid||[1,Va])[1],!C){for(I=-Va;I<(I=x[C++].getBoundingClientRect().left)&&C<g;);C<g&&C--}for(p=s[g]=[],m=l?Math.min(C,g)*u-.5:n%C,y=C===Va?0:l?g*f/C-.5:n/C|0,I=0,_=Va,w=0;w<g;w++)L=w%C-m,v=y-(w/C|0),p[w]=S=c?Math.abs(c==="y"?v:L):pg(L*L+v*v),S>I&&(I=S),S<_&&(_=S);n==="random"&&Tg(p),p.max=I-_,p.min=_,p.v=g=(parseFloat(t.amount)||parseFloat(t.each)*(C>g?g-1:c?c==="y"?g/C:C:Math.max(C,g/C))||0)*(n==="edges"?-1:1),p.b=g<0?r-g:r,p.u=Qt(t.amount||t.each)||0,a=a&&g<0?bw(a):a}return g=(p[d]-p.min)/p.max||0,At(p.b+(a?a(g):g)*p.v)+p.u}},mf=function(e){var t=Math.pow(10,((e+"").split(".")[1]||"").length);return function(a){var n=At(Math.round(parseFloat(a)/e)*e*t);return(n-n%1)/t+(Hn(a)?0:Qt(a))}},Eg=function(e,t){var a=la(e),n,r;return!a&&Cn(e)&&(n=a=e.radius||Va,e.values?(e=Ga(e.values),(r=!Hn(e[0]))&&(n*=n)):e=mf(e.increment)),mi(t,a?Pt(e)?function(s){return r=e(s),Math.abs(r-s)<=n?r:s}:function(s){for(var o=parseFloat(r?s.x:s),l=parseFloat(r?s.y:0),c=Va,u=0,f=e.length,d,h;f--;)r?(d=e[f].x-o,h=e[f].y-l,d=d*d+h*h):d=Math.abs(e[f]-o),d<c&&(c=d,u=f);return u=!n||c<=n?e[u]:s,r||u===s||Hn(s)?u:u+Qt(s)}:mf(e))},Rg=function(e,t,a,n){return mi(la(e)?!t:a===!0?!!(a=0):!n,function(){return la(e)?e[~~(Math.random()*e.length)]:(a=a||1e-5)&&(n=a<1?Math.pow(10,(a+"").length-2):1)&&Math.floor(Math.round((e-a/2+Math.random()*(t-e+a*.99))/a)*a*n)/n})},lw=function(){for(var e=arguments.length,t=new Array(e),a=0;a<e;a++)t[a]=arguments[a];return function(n){return t.reduce(function(r,s){return s(r)},n)}},cw=function(e,t){return function(a){return e(parseFloat(a))+(t||Qt(a))}},uw=function(e,t,a){return Dg(e,t,0,1,a)},Pg=function(e,t,a){return mi(a,function(n){return e[~~t(n)]})},dw=function i(e,t,a){var n=t-e;return la(e)?Pg(e,i(0,e.length),t):mi(a,function(r){return(n+(r-e)%n)%n+e})},fw=function i(e,t,a){var n=t-e,r=n*2;return la(e)?Pg(e,i(0,e.length-1),t):mi(a,function(s){return s=(r+(s-e)%r)%r||0,e+(s>n?r-s:s)})},Yr=function(e){return e.replace(qS,function(t){var a=t.indexOf("[")+1,n=t.substring(a||7,a?t.indexOf("]"):t.length-1).split(XS);return Rg(a?n:+n[0],a?0:+n[1],+n[2]||1e-5)})},Dg=function(e,t,a,n,r){var s=t-e,o=n-a;return mi(r,function(l){return a+((l-e)/s*o||0)})},hw=function i(e,t,a,n){var r=isNaN(e+t)?0:function(h){return(1-h)*e+h*t};if(!r){var s=Wt(e),o={},l,c,u,f,d;if(a===!0&&(n=1)&&(a=null),s)e={p:e},t={p:t};else if(la(e)&&!la(t)){for(u=[],f=e.length,d=f-2,c=1;c<f;c++)u.push(i(e[c-1],e[c]));f--,r=function(x){x*=f;var g=Math.min(d,~~x);return u[g](x-g)},a=t}else n||(e=Gr(la(e)?[]:{},e));if(!u){for(l in t)Ef.call(o,e,l,"get",t[l]);r=function(x){return kf(x,o)||(s?e.p:e)}}}return mi(a,r)},ug=function(e,t,a){var n=e.labels,r=Va,s,o,l;for(s in n)o=n[s]-t,o<0==!!a&&o&&r>(o=Math.abs(o))&&(l=s,r=o);return l},Aa=function(e,t,a){var n=e.vars,r=n[t],s=It,o=e._ctx,l,c,u;if(r)return l=n[t+"Params"],c=n.callbackScope||e,a&&fi.length&&tu(),o&&(It=o),u=l?r.apply(c,l):r.call(c),It=s,u},go=function(e){return pi(e),e.scrollTrigger&&e.scrollTrigger.kill(!!$t),e.progress()<1&&Aa(e,"onInterrupt"),e},Vr,Fg=[],kg=function(e){if(e)if(e=!e.name&&e.default||e,vf()||e.headless){var t=e.name,a=Pt(e),n=t&&!a&&e.init?function(){this._props=[]}:e,r={init:wo,render:kf,add:Ef,kill:Ew,modifier:Aw,rawVars:0},s={targetTest:0,get:0,getSetter:uu,aliases:{},register:0};if(Xr(),e!==n){if(_a[t])return;Ra(n,Ra(au(e,r),s)),Gr(n.prototype,Gr(r,au(e,s))),_a[n.prop=t]=n,e.targetTest&&(Qc.push(n),wf[t]=1),t=(t==="css"?"CSS":t.charAt(0).toUpperCase()+t.substr(1))+"Plugin"}_g(t,n),e.register&&e.register(ca,n,ma)}else Fg.push(e)},vt=255,xo={aqua:[0,vt,vt],lime:[0,vt,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,vt],navy:[0,0,128],white:[vt,vt,vt],olive:[128,128,0],yellow:[vt,vt,0],orange:[vt,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[vt,0,0],pink:[vt,192,203],cyan:[0,vt,vt],transparent:[vt,vt,vt,0]},af=function(e,t,a){return e+=e<0?1:e>1?-1:0,(e*6<1?t+(a-t)*e*6:e<.5?a:e*3<2?t+(a-t)*(2/3-e)*6:t)*vt+.5|0},Ug=function(e,t,a){var n=e?Hn(e)?[e>>16,e>>8&vt,e&vt]:0:xo.black,r,s,o,l,c,u,f,d,h,x;if(!n){if(e.substr(-1)===","&&(e=e.substr(0,e.length-1)),xo[e])n=xo[e];else if(e.charAt(0)==="#"){if(e.length<6&&(r=e.charAt(1),s=e.charAt(2),o=e.charAt(3),e="#"+r+r+s+s+o+o+(e.length===5?e.charAt(4)+e.charAt(4):"")),e.length===9)return n=parseInt(e.substr(1,6),16),[n>>16,n>>8&vt,n&vt,parseInt(e.substr(7),16)/255];e=parseInt(e.substr(1),16),n=[e>>16,e>>8&vt,e&vt]}else if(e.substr(0,3)==="hsl"){if(n=x=e.match(rg),!t)l=+n[0]%360/360,c=+n[1]/100,u=+n[2]/100,s=u<=.5?u*(c+1):u+c-u*c,r=u*2-s,n.length>3&&(n[3]*=1),n[0]=af(l+1/3,r,s),n[1]=af(l,r,s),n[2]=af(l-1/3,r,s);else if(~e.indexOf("="))return n=e.match(bf),a&&n.length<4&&(n[3]=1),n}else n=e.match(rg)||xo.transparent;n=n.map(Number)}return t&&!x&&(r=n[0]/vt,s=n[1]/vt,o=n[2]/vt,f=Math.max(r,s,o),d=Math.min(r,s,o),u=(f+d)/2,f===d?l=c=0:(h=f-d,c=u>.5?h/(2-f-d):h/(f+d),l=f===r?(s-o)/h+(s<o?6:0):f===s?(o-r)/h+2:(r-s)/h+4,l*=60),n[0]=~~(l+.5),n[1]=~~(c*100+.5),n[2]=~~(u*100+.5)),a&&n.length<4&&(n[3]=1),n},Ng=function(e){var t=[],a=[],n=-1;return e.split(zn).forEach(function(r){var s=r.match(Hi)||[];t.push.apply(t,s),a.push(n+=s.length+1)}),t.c=a,t},dg=function(e,t,a){var n="",r=(e+n).match(zn),s=t?"hsla(":"rgba(",o=0,l,c,u,f;if(!r)return e;if(r=r.map(function(d){return(d=Ug(d,t,1))&&s+(t?d[0]+","+d[1]+"%,"+d[2]+"%,"+d[3]:d.join(","))+")"}),a&&(u=Ng(e),l=a.c,l.join(n)!==u.c.join(n)))for(c=e.replace(zn,"1").split(Hi),f=c.length-1;o<f;o++)n+=c[o]+(~l.indexOf(o)?r.shift()||s+"0,0,0,0)":(u.length?u:r.length?r:a).shift());if(!c)for(c=e.split(zn),f=c.length-1;o<f;o++)n+=c[o]+r[o];return n+c[f]},zn=(function(){var i="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",e;for(e in xo)i+="|"+e+"\\b";return new RegExp(i+")","gi")})(),pw=/hsl[a]?\(/,Tf=function(e){var t=e.join(" "),a;if(zn.lastIndex=0,zn.test(t))return a=pw.test(t),e[1]=dg(e[1],a),e[0]=dg(e[0],a,Ng(e[1])),!0},Mo,va=(function(){var i=Date.now,e=500,t=33,a=i(),n=a,r=1e3/240,s=r,o=[],l,c,u,f,d,h,x=function g(p){var m=i()-n,y=p===!0,L,v,S,w;if((m>e||m<0)&&(a+=m-t),n+=m,S=n-a,L=S-s,(L>0||y)&&(w=++f.frame,d=S-f.time*1e3,f.time=S=S/1e3,s+=L+(L>=r?4:r-L),v=1),y||(l=c(g)),v)for(h=0;h<o.length;h++)o[h](S,d,w,p)};return f={time:0,frame:0,tick:function(){x(!0)},deltaRatio:function(p){return d/(1e3/(p||60))},wake:function(){gg&&(!cf&&vf()&&(Mn=cf=window,Sf=Mn.document||{},Ea.gsap=ca,(Mn.gsapVersions||(Mn.gsapVersions=[])).push(ca.version),xg(eu||Mn.GreenSockGlobals||!Mn.gsap&&Mn||{}),Fg.forEach(kg)),u=typeof requestAnimationFrame<"u"&&requestAnimationFrame,l&&f.sleep(),c=u||function(p){return setTimeout(p,s-f.time*1e3+1|0)},Mo=1,x(2))},sleep:function(){(u?cancelAnimationFrame:clearTimeout)(l),Mo=0,c=wo},lagSmoothing:function(p,m){e=p||1/0,t=Math.min(m||33,e)},fps:function(p){r=1e3/(p||240),s=f.time*1e3+r},add:function(p,m,y){var L=m?function(v,S,w,I){p(v,S,w,I),f.remove(L)}:p;return f.remove(p),o[y?"unshift":"push"](L),Xr(),L},remove:function(p,m){~(m=o.indexOf(p))&&o.splice(m,1)&&h>=m&&h--},_listeners:o},f})(),Xr=function(){return!Mo&&va.wake()},st={},mw=/^[\d.\-M][\d.\-,\s]/,gw=/["']/g,xw=function(e){for(var t={},a=e.substr(1,e.length-3).split(":"),n=a[0],r=1,s=a.length,o,l,c;r<s;r++)l=a[r],o=r!==s-1?l.lastIndexOf(","):l.length,c=l.substr(0,o),t[n]=isNaN(c)?c.replace(gw,"").trim():+c,n=l.substr(o+1).trim();return t},_w=function(e){var t=e.indexOf("(")+1,a=e.indexOf(")"),n=e.indexOf("(",t);return e.substring(t,~n&&n<a?e.indexOf(")",a+1):a)},vw=function(e){var t=(e+"").split("("),a=st[t[0]];return a&&t.length>1&&a.config?a.config.apply(null,~e.indexOf("{")?[xw(t[1])]:_w(e).split(",").map(yg)):st._CE&&mw.test(e)?st._CE("",e):a},bw=function(e){return function(t){return 1-e(1-t)}},Oi=function(e,t){return e&&(Pt(e)?e:st[e]||vw(e))||t},Gi=function(e,t,a,n){a===void 0&&(a=function(l){return 1-t(1-l)}),n===void 0&&(n=function(l){return l<.5?t(l*2)/2:1-t((1-l)*2)/2});var r={easeIn:t,easeOut:a,easeInOut:n},s;return pa(e,function(o){st[o]=Ea[o]=r,st[s=o.toLowerCase()]=a;for(var l in r)st[s+(l==="easeIn"?".in":l==="easeOut"?".out":".inOut")]=st[o+"."+l]=r[l]}),r},Bg=function(e){return function(t){return t<.5?(1-e(1-t*2))/2:.5+e((t-.5)*2)/2}},nf=function i(e,t,a){var n=t>=1?t:1,r=(a||(e?.3:.45))/(t<1?t:1),s=r/lf*(Math.asin(1/n)||0),o=function(u){return u===1?1:n*Math.pow(2,-10*u)*WS((u-s)*r)+1},l=e==="out"?o:e==="in"?function(c){return 1-o(1-c)}:Bg(o);return r=lf/r,l.config=function(c,u){return i(e,c,u)},l},rf=function i(e,t){t===void 0&&(t=1.70158);var a=function(s){return s?--s*s*((t+1)*s+t)+1:0},n=e==="out"?a:e==="in"?function(r){return 1-a(1-r)}:Bg(a);return n.config=function(r){return i(e,r)},n};pa("Linear,Quad,Cubic,Quart,Quint,Strong",function(i,e){var t=e<5?e+1:e;Gi(i+",Power"+(t-1),e?function(a){return Math.pow(a,t)}:function(a){return a},function(a){return 1-Math.pow(1-a,t)},function(a){return a<.5?Math.pow(a*2,t)/2:1-Math.pow((1-a)*2,t)/2})});st.Linear.easeNone=st.none=st.Linear.easeIn;Gi("Elastic",nf("in"),nf("out"),nf());(function(i,e){var t=1/e,a=2*t,n=2.5*t,r=function(o){return o<t?i*o*o:o<a?i*Math.pow(o-1.5/e,2)+.75:o<n?i*(o-=2.25/e)*o+.9375:i*Math.pow(o-2.625/e,2)+.984375};Gi("Bounce",function(s){return 1-r(1-s)},r)})(7.5625,2.75);Gi("Expo",function(i){return Math.pow(2,10*(i-1))*i+i*i*i*i*i*i*(1-i)});Gi("Circ",function(i){return-(pg(1-i*i)-1)});Gi("Sine",function(i){return i===1?1:-GS(i*HS)+1});Gi("Back",rf("in"),rf("out"),rf());st.SteppedEase=st.steps=Ea.SteppedEase={config:function(e,t){e===void 0&&(e=1);var a=1/e,n=e+(t?0:1),r=t?1:0,s=1-bt;return function(o){return((n*Co(0,s,o)|0)+r)*a}}};yo.ease=st["quad.out"];pa("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",function(i){return Mf+=i+","+i+"Params,"});var Af=function(e,t){this.id=VS++,e._gsap=this,this.target=e,this.harness=t,this.get=t?t.get:Cf,this.set=t?t.getSetter:uu},Lo=(function(){function i(t){this.vars=t,this._delay=+t.delay||0,(this._repeat=t.repeat===1/0?-2:t.repeat||0)&&(this._rDelay=t.repeatDelay||0,this._yoyo=!!t.yoyo||!!t.yoyoEase),this._ts=1,qr(this,+t.duration,1,1),this.data=t.data,It&&(this._ctx=It,It.data.push(this)),Mo||va.wake()}var e=i.prototype;return e.delay=function(a){return a||a===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+a-this._delay),this._delay=a,this):this._delay},e.duration=function(a){return arguments.length?this.totalDuration(this._repeat>0?a+(a+this._rDelay)*this._repeat:a):this.totalDuration()&&this._dur},e.totalDuration=function(a){return arguments.length?(this._dirty=0,qr(this,this._repeat<0?a:(a-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},e.totalTime=function(a,n){if(Xr(),!arguments.length)return this._tTime;var r=this._dp;if(r&&r.smoothChildTiming&&this._ts){for(cu(this,a),!r._dp||r.parent||Mg(r,this);r&&r.parent;)r.parent._time!==r._start+(r._ts>=0?r._tTime/r._ts:(r.totalDuration()-r._tTime)/-r._ts)&&r.totalTime(r._tTime,!0),r=r.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&a<this._tDur||this._ts<0&&a>0||!this._tDur&&!a)&&Ln(this._dp,this,this._start-this._delay)}return(this._tTime!==a||!this._dur&&!n||this._initted&&Math.abs(this._zTime)===bt||!this._initted&&this._dur&&a||!a&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=a),bg(this,a,n)),this},e.time=function(a,n){return arguments.length?this.totalTime(Math.min(this.totalDuration(),a+lg(this))%(this._dur+this._rDelay)||(a?this._dur:0),n):this._time},e.totalProgress=function(a,n){return arguments.length?this.totalTime(this.totalDuration()*a,n):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},e.progress=function(a,n){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-a:a)+lg(this),n):this.duration()?Math.min(1,this._time/this._dur):this.rawTime()>0?1:0},e.iteration=function(a,n){var r=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(a-1)*r,n):this._repeat?Wr(this._tTime,r)+1:1},e.timeScale=function(a,n){if(!arguments.length)return this._rts===-bt?0:this._rts;if(this._rts===a)return this;var r=this.parent&&this._ts?nu(this.parent._time,this):this._tTime;return this._rts=+a||0,this._ts=this._ps||a===-bt?0:this._rts,this.totalTime(Co(-Math.abs(this._delay),this.totalDuration(),r),n!==!1),lu(this),ew(this)},e.paused=function(a){return arguments.length?(this._ps!==a&&(this._ps=a,a?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):(Xr(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==bt&&(this._tTime-=bt)))),this):this._ps},e.startTime=function(a){if(arguments.length){this._start=At(a);var n=this.parent||this._dp;return n&&(n._sort||!this.parent)&&Ln(n,this,this._start-this._delay),this}return this._start},e.endTime=function(a){return this._start+(ba(a)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},e.rawTime=function(a){var n=this.parent||this._dp;return n?a&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?nu(n.rawTime(a),this):this._tTime:this._tTime},e.revert=function(a){a===void 0&&(a=JS);var n=$t;return $t=a,If(this)&&(this.timeline&&this.timeline.revert(a),this.totalTime(-.01,a.suppressEvents)),this.data!=="nested"&&a.kill!==!1&&this.kill(),$t=n,this},e.globalTime=function(a){for(var n=this,r=arguments.length?a:n.rawTime();n;)r=n._start+r/(Math.abs(n._ts)||1),n=n._dp;return!this.parent&&this._sat?this._sat.globalTime(a):r},e.repeat=function(a){return arguments.length?(this._repeat=a===1/0?-2:a,cg(this)):this._repeat===-2?1/0:this._repeat},e.repeatDelay=function(a){if(arguments.length){var n=this._time;return this._rDelay=a,cg(this),n?this.time(n):this}return this._rDelay},e.yoyo=function(a){return arguments.length?(this._yoyo=a,this):this._yoyo},e.seek=function(a,n){return this.totalTime(Ha(this,a),ba(n))},e.restart=function(a,n){return this.play().totalTime(a?-this._delay:0,ba(n)),this._dur||(this._zTime=-bt),this},e.play=function(a,n){return a!=null&&this.seek(a,n),this.reversed(!1).paused(!1)},e.reverse=function(a,n){return a!=null&&this.seek(a||this.totalDuration(),n),this.reversed(!0).paused(!1)},e.pause=function(a,n){return a!=null&&this.seek(a,n),this.paused(!0)},e.resume=function(){return this.paused(!1)},e.reversed=function(a){return arguments.length?(!!a!==this.reversed()&&this.timeScale(-this._rts||(a?-bt:0)),this):this._rts<0},e.invalidate=function(){return this._initted=this._act=0,this._zTime=-bt,this},e.isActive=function(){var a=this.parent||this._dp,n=this._start,r;return!!(!a||this._ts&&this._initted&&a.isActive()&&(r=a.rawTime(!0))>=n&&r<this.endTime(!0)-bt)},e.eventCallback=function(a,n,r){var s=this.vars;return arguments.length>1?(n?(s[a]=n,r&&(s[a+"Params"]=r),a==="onUpdate"&&(this._onUpdate=n)):delete s[a],this):s[a]},e.then=function(a){var n=this,r=n._prom;return new Promise(function(s){var o=Pt(a)?a:Sg,l=function(){var u=n.then;n.then=null,r&&r(),Pt(o)&&(o=o(n))&&(o.then||o===n)&&(n.then=u),s(o),n.then=u};n._initted&&n.totalProgress()===1&&n._ts>=0||!n._tTime&&n._ts<0?l():n._prom=l})},e.kill=function(){go(this)},i})();Ra(Lo.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-bt,_prom:0,_ps:!1,_rts:1});var oa=(function(i){hg(e,i);function e(a,n){var r;return a===void 0&&(a={}),r=i.call(this,a)||this,r.labels={},r.smoothChildTiming=!!a.smoothChildTiming,r.autoRemoveChildren=!!a.autoRemoveChildren,r._sort=ba(a.sortChildren),Et&&Ln(a.parent||Et,On(r),n),a.reversed&&r.reverse(),a.paused&&r.paused(!0),a.scrollTrigger&&Lg(On(r),a.scrollTrigger),r}var t=e.prototype;return t.to=function(n,r,s){return vo(0,arguments,this),this},t.from=function(n,r,s){return vo(1,arguments,this),this},t.fromTo=function(n,r,s,o){return vo(2,arguments,this),this},t.set=function(n,r,s){return r.duration=0,r.parent=this,_o(r).repeatDelay||(r.repeat=0),r.immediateRender=!!r.immediateRender,new kt(n,r,Ha(this,s),1),this},t.call=function(n,r,s){return Ln(this,kt.delayedCall(0,n,r),s)},t.staggerTo=function(n,r,s,o,l,c,u){return s.duration=r,s.stagger=s.stagger||o,s.onComplete=c,s.onCompleteParams=u,s.parent=this,new kt(n,s,Ha(this,l)),this},t.staggerFrom=function(n,r,s,o,l,c,u){return s.runBackwards=1,_o(s).immediateRender=ba(s.immediateRender),this.staggerTo(n,r,s,o,l,c,u)},t.staggerFromTo=function(n,r,s,o,l,c,u,f){return o.startAt=s,_o(o).immediateRender=ba(o.immediateRender),this.staggerTo(n,r,o,l,c,u,f)},t.render=function(n,r,s){var o=this._time,l=this._dirty?this.totalDuration():this._tDur,c=this._dur,u=n<=0?0:At(n),f=this._zTime<0!=n<0&&(this._initted||!c),d,h,x,g,p,m,y,L,v,S,w,I;if(this!==Et&&u>l&&n>=0&&(u=l),u!==this._tTime||s||f){if(o!==this._time&&c&&(u+=this._time-o,n+=this._time-o),d=u,v=this._start,L=this._ts,m=!L,f&&(c||(o=this._zTime),(n||!r)&&(this._zTime=n)),this._repeat){if(w=this._yoyo,p=c+this._rDelay,this._repeat<-1&&n<0)return this.totalTime(p*100+n,r,s);if(d=At(u%p),u===l?(g=this._repeat,d=c):(S=At(u/p),g=~~S,g&&g===S&&(d=c,g--),d>c&&(d=c)),S=Wr(this._tTime,p),!o&&this._tTime&&S!==g&&this._tTime-S*p-this._dur<=0&&(S=g),w&&g&1&&(d=c-d,I=1),g!==S&&!this._lock){var _=w&&S&1,C=_===(w&&g&1);if(g<S&&(_=!_),o=_?0:u%c?c:u,this._lock=1,this.render(o||(I?0:At(g*p)),r,!c)._lock=0,this._tTime=u,!r&&this.parent&&Aa(this,"onRepeat"),this.vars.repeatRefresh&&!I&&(this.invalidate()._lock=1,S=g),o&&o!==this._time||m!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act)return this;if(c=this._dur,l=this._tDur,C&&(this._lock=2,o=_?c:-1e-4,this.render(o,!0),this.vars.repeatRefresh&&!I&&this.invalidate()),this._lock=0,!this._ts&&!m)return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(y=iw(this,At(o),At(d)),y&&(u-=d-(d=y._start))),this._tTime=u,this._time=d,this._act=!!L,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=n,o=0),!o&&u&&c&&!r&&!S&&(Aa(this,"onStart"),this._tTime!==u))return this;if(d>=o&&n>=0)for(h=this._first;h;){if(x=h._next,(h._act||d>=h._start)&&h._ts&&y!==h){if(h.parent!==this)return this.render(n,r,s);if(h.render(h._ts>0?(d-h._start)*h._ts:(h._dirty?h.totalDuration():h._tDur)+(d-h._start)*h._ts,r,s),d!==this._time||!this._ts&&!m){y=0,x&&(u+=this._zTime=-bt);break}}h=x}else{h=this._last;for(var A=n<0?n:d;h;){if(x=h._prev,(h._act||A<=h._end)&&h._ts&&y!==h){if(h.parent!==this)return this.render(n,r,s);if(h.render(h._ts>0?(A-h._start)*h._ts:(h._dirty?h.totalDuration():h._tDur)+(A-h._start)*h._ts,r,s||$t&&If(h)),d!==this._time||!this._ts&&!m){y=0,x&&(u+=this._zTime=A?-bt:bt);break}}h=x}}if(y&&!r&&(this.pause(),y.render(d>=o?0:-bt)._zTime=d>=o?1:-1,this._ts))return this._start=v,lu(this),this.render(n,r,s);this._onUpdate&&!r&&Aa(this,"onUpdate",!0),(u===l&&this._tTime>=this.totalDuration()||!u&&o)&&(v===this._start||Math.abs(L)!==Math.abs(this._ts))&&(this._lock||((n||!c)&&(u===l&&this._ts>0||!u&&this._ts<0)&&pi(this,1),!r&&!(n<0&&!o)&&(u||o||!l)&&(Aa(this,u===l&&n>=0?"onComplete":"onReverseComplete",!0),this._prom&&!(u<l&&this.timeScale()>0)&&this._prom())))}return this},t.add=function(n,r){var s=this;if(Hn(r)||(r=Ha(this,r,n)),!(n instanceof Lo)){if(la(n))return n.forEach(function(o){return s.add(o,r)}),this;if(Wt(n))return this.addLabel(n,r);if(Pt(n))n=kt.delayedCall(0,n);else return this}return this!==n?Ln(this,n,r):this},t.getChildren=function(n,r,s,o){n===void 0&&(n=!0),r===void 0&&(r=!0),s===void 0&&(s=!0),o===void 0&&(o=-Va);for(var l=[],c=this._first;c;)c._start>=o&&(c instanceof kt?r&&l.push(c):(s&&l.push(c),n&&l.push.apply(l,c.getChildren(!0,r,s)))),c=c._next;return l},t.getById=function(n){for(var r=this.getChildren(1,1,1),s=r.length;s--;)if(r[s].vars.id===n)return r[s]},t.remove=function(n){return Wt(n)?this.removeLabel(n):Pt(n)?this.killTweensOf(n):(n.parent===this&&ou(this,n),n===this._recent&&(this._recent=this._last),Bi(this))},t.totalTime=function(n,r){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=At(va.time-(this._ts>0?n/this._ts:(this.totalDuration()-n)/-this._ts))),i.prototype.totalTime.call(this,n,r),this._forcing=0,this):this._tTime},t.addLabel=function(n,r){return this.labels[n]=Ha(this,r),this},t.removeLabel=function(n){return delete this.labels[n],this},t.addPause=function(n,r,s){var o=kt.delayedCall(0,r||wo,s);return o.data="isPause",this._hasPause=1,Ln(this,o,Ha(this,n))},t.removePause=function(n){var r=this._first;for(n=Ha(this,n);r;)r._start===n&&r.data==="isPause"&&pi(r),r=r._next},t.killTweensOf=function(n,r,s){for(var o=this.getTweensOf(n,s),l=o.length;l--;)di!==o[l]&&o[l].kill(n,r);return this},t.getTweensOf=function(n,r){for(var s=[],o=Ga(n),l=this._first,c=Hn(r),u;l;)l instanceof kt?$S(l._targets,o)&&(c?(!di||l._initted&&l._ts)&&l.globalTime(0)<=r&&l.globalTime(l.totalDuration())>r:!r||l.isActive())&&s.push(l):(u=l.getTweensOf(o,r)).length&&s.push.apply(s,u),l=l._next;return s},t.tweenTo=function(n,r){r=r||{};var s=this,o=Ha(s,n),l=r,c=l.startAt,u=l.onStart,f=l.onStartParams,d=l.immediateRender,h,x=kt.to(s,Ra({ease:r.ease||"none",lazy:!1,immediateRender:!1,time:o,overwrite:"auto",duration:r.duration||Math.abs((o-(c&&"time"in c?c.time:s._time))/s.timeScale())||bt,onStart:function(){if(s.pause(),!h){var p=r.duration||Math.abs((o-(c&&"time"in c?c.time:s._time))/s.timeScale());x._dur!==p&&qr(x,p,0,1).render(x._time,!0,!0),h=1}u&&u.apply(x,f||[])}},r));return d?x.render(0):x},t.tweenFromTo=function(n,r,s){return this.tweenTo(r,Ra({startAt:{time:Ha(this,n)}},s))},t.recent=function(){return this._recent},t.nextLabel=function(n){return n===void 0&&(n=this._time),ug(this,Ha(this,n))},t.previousLabel=function(n){return n===void 0&&(n=this._time),ug(this,Ha(this,n),1)},t.currentLabel=function(n){return arguments.length?this.seek(n,!0):this.previousLabel(this._time+bt)},t.shiftChildren=function(n,r,s){s===void 0&&(s=0);var o=this._first,l=this.labels,c;for(n=At(n);o;)o._start>=s&&(o._start+=n,o._end+=n),o=o._next;if(r)for(c in l)l[c]>=s&&(l[c]+=n);return Bi(this)},t.invalidate=function(n){var r=this._first;for(this._lock=0;r;)r.invalidate(n),r=r._next;return i.prototype.invalidate.call(this,n)},t.clear=function(n){n===void 0&&(n=!0);for(var r=this._first,s;r;)s=r._next,this.remove(r),r=s;return this._dp&&(this._time=this._tTime=this._pTime=0),n&&(this.labels={}),Bi(this)},t.totalDuration=function(n){var r=0,s=this,o=s._last,l=Va,c,u,f;if(arguments.length)return s.timeScale((s._repeat<0?s.duration():s.totalDuration())/(s.reversed()?-n:n));if(s._dirty){for(f=s.parent;o;)c=o._prev,o._dirty&&o.totalDuration(),u=o._start,u>l&&s._sort&&o._ts&&!s._lock?(s._lock=1,Ln(s,o,u-o._delay,1)._lock=0):l=u,u<0&&o._ts&&(r-=u,(!f&&!s._dp||f&&f.smoothChildTiming)&&(s._start+=At(u/s._ts),s._time-=u,s._tTime-=u),s.shiftChildren(-u,!1,-1/0),l=0),o._end>r&&o._ts&&(r=o._end),o=c;qr(s,s===Et&&s._time>r?s._time:r,1,1),s._dirty=0}return s._tDur},e.updateRoot=function(n){if(Et._ts&&(bg(Et,nu(n,Et)),vg=va.frame),va.frame>=sg){sg+=ya.autoSleep||120;var r=Et._first;if((!r||!r._ts)&&ya.autoSleep&&va._listeners.length<2){for(;r&&!r._ts;)r=r._next;r||va.sleep()}}},e})(Lo);Ra(oa.prototype,{_lock:0,_hasPause:0,_forcing:0});var yw=function(e,t,a,n,r,s,o){var l=new ma(this._pt,e,t,0,1,Ff,null,r),c=0,u=0,f,d,h,x,g,p,m,y;for(l.b=a,l.e=n,a+="",n+="",(m=~n.indexOf("random("))&&(n=Yr(n)),s&&(y=[a,n],s(y,e,t),a=y[0],n=y[1]),d=a.match(ef)||[];f=ef.exec(n);)x=f[0],g=n.substring(c,f.index),h?h=(h+1)%5:g.substr(-5)==="rgba("&&(h=1),x!==d[u++]&&(p=parseFloat(d[u-1])||0,l._pt={_next:l._pt,p:g||u===1?g:",",s:p,c:x.charAt(1)==="="?Vi(p,x)-p:parseFloat(x)-p,m:h&&h<4?Math.round:0},c=ef.lastIndex);return l.c=c<n.length?n.substring(c,n.length):"",l.fp=o,(yf.test(n)||m)&&(l.e=0),this._pt=l,l},Ef=function(e,t,a,n,r,s,o,l,c,u){Pt(n)&&(n=n(r||0,e,s));var f=e[t],d=a!=="get"?a:Pt(f)?c?e[t.indexOf("set")||!Pt(e["get"+t.substr(3)])?t:"get"+t.substr(3)](c):e[t]():f,h=Pt(f)?c?Cw:Hg:Df,x;if(Wt(n)&&(~n.indexOf("random(")&&(n=Yr(n)),n.charAt(1)==="="&&(x=Vi(d,n)+(Qt(d)||0),(x||x===0)&&(n=x))),!u||d!==n||gf)return!isNaN(d*n)&&n!==""?(x=new ma(this._pt,e,t,+d||0,n-(d||0),typeof f=="boolean"?Tw:Vg,0,h),c&&(x.fp=c),o&&x.modifier(o,this,e),this._pt=x):(!f&&!(t in e)&&su(t,n),yw.call(this,e,t,d,n,h,l||ya.stringFilter,c))},Sw=function(e,t,a,n,r){if(Pt(e)&&(e=bo(e,r,t,a,n)),!Cn(e)||e.style&&e.nodeType||la(e)||mg(e))return Wt(e)?bo(e,r,t,a,n):e;var s={},o;for(o in e)s[o]=bo(e[o],r,t,a,n);return s},Rf=function(e,t,a,n,r,s){var o,l,c,u;if(_a[e]&&(o=new _a[e]).init(r,o.rawVars?t[e]:Sw(t[e],n,r,s,a),a,n,s)!==!1&&(a._pt=l=new ma(a._pt,r,e,0,1,o.render,o,0,o.priority),a!==Vr))for(c=a._ptLookup[a._targets.indexOf(r)],u=o._props.length;u--;)c[o._props[u]]=l;return o},di,gf,Pf=function i(e,t,a){var n=e.vars,r=n.ease,s=n.startAt,o=n.immediateRender,l=n.lazy,c=n.onUpdate,u=n.runBackwards,f=n.yoyoEase,d=n.keyframes,h=n.autoRevert,x=e._dur,g=e._startAt,p=e._targets,m=e.parent,y=m&&m.data==="nested"?m.vars.targets:p,L=e._overwrite==="auto"&&!_f,v=e.timeline,S=n.easeReverse||f,w,I,_,C,A,E,F,U,R,B,q,H,te;if(v&&(!d||!r)&&(r="none"),e._ease=Oi(r,yo.ease),e._rEase=S&&(Oi(S)||e._ease),e._from=!v&&!!n.runBackwards,e._from&&(e.ratio=1),!v||d&&!n.stagger){if(U=p[0]?hi(p[0]).harness:0,H=U&&n[U.prop],w=au(n,wf),g&&(g._zTime<0&&g.progress(1),t<0&&u&&o&&!h?g.render(-1,!0):g.revert(u&&x?$c:KS),g._lazy=0),s){if(pi(e._startAt=kt.set(p,Ra({data:"isStart",overwrite:!1,parent:m,immediateRender:!0,lazy:!g&&ba(l),startAt:null,delay:0,onUpdate:c&&function(){return Aa(e,"onUpdate")},stagger:0},s))),e._startAt._dp=0,e._startAt._sat=e,t<0&&($t||!o&&!h)&&e._startAt.revert($c),o&&x&&t<=0&&a<=0){t&&(e._zTime=t);return}}else if(u&&x&&!g){if(t&&(o=!1),_=Ra({overwrite:!1,data:"isFromStart",lazy:o&&!g&&ba(l),immediateRender:o,stagger:0,parent:m},w),H&&(_[U.prop]=H),pi(e._startAt=kt.set(p,_)),e._startAt._dp=0,e._startAt._sat=e,t<0&&($t?e._startAt.revert($c):e._startAt.render(-1,!0)),e._zTime=t,!o)i(e._startAt,bt,bt);else if(!t)return}for(e._pt=e._ptCache=0,l=x&&ba(l)||l&&!x,I=0;I<p.length;I++){if(A=p[I],F=A._gsap||Lf(p)[I]._gsap,e._ptLookup[I]=B={},uf[F.id]&&fi.length&&tu(),q=y===p?I:y.indexOf(A),U&&(R=new U).init(A,H||w,e,q,y)!==!1&&(e._pt=C=new ma(e._pt,A,R.name,0,1,R.render,R,0,R.priority),R._props.forEach(function(Y){B[Y]=C}),R.priority&&(E=1)),!U||H)for(_ in w)_a[_]&&(R=Rf(_,w,e,q,A,y))?R.priority&&(E=1):B[_]=C=Ef.call(e,A,_,"get",w[_],q,y,0,n.stringFilter);e._op&&e._op[I]&&e.kill(A,e._op[I]),L&&e._pt&&(di=e,Et.killTweensOf(A,B,e.globalTime(t)),te=!e.parent,di=0),e._pt&&l&&(uf[F.id]=1)}E&&Uf(e),e._onInit&&e._onInit(e)}e._onUpdate=c,e._initted=(!e._op||e._pt)&&!te,d&&t<=0&&v.render(Va,!0,!0)},ww=function(e,t,a,n,r,s,o,l){var c=(e._pt&&e._ptCache||(e._ptCache={}))[t],u,f,d,h;if(!c)for(c=e._ptCache[t]=[],d=e._ptLookup,h=e._targets.length;h--;){if(u=d[h][t],u&&u.d&&u.d._pt)for(u=u.d._pt;u&&u.p!==t&&u.fp!==t;)u=u._next;if(!u)return gf=1,e.vars[t]="+=0",Pf(e,o),gf=0,l?So(t+" not eligible for reset. Try splitting into individual properties"):1;c.push(u)}for(h=c.length;h--;)f=c[h],u=f._pt||f,u.s=(n||n===0)&&!r?n:u.s+(n||0)+s*u.c,u.c=a-u.s,f.e&&(f.e=Dt(a)+Qt(f.e)),f.b&&(f.b=u.s+Qt(f.b))},Mw=function(e,t){var a=e[0]?hi(e[0]).harness:0,n=a&&a.aliases,r,s,o,l;if(!n)return t;r=Gr({},t);for(s in n)if(s in r)for(l=n[s].split(","),o=l.length;o--;)r[l[o]]=r[s];return r},Lw=function(e,t,a,n){var r=t.ease||n||"power1.inOut",s,o;if(la(t))o=a[e]||(a[e]=[]),t.forEach(function(l,c){return o.push({t:c/(t.length-1)*100,v:l,e:r})});else for(s in t)o=a[s]||(a[s]=[]),s==="ease"||o.push({t:parseFloat(e),v:t[s],e:r})},bo=function(e,t,a,n,r){return Pt(e)?e.call(t,a,n,r):Wt(e)&&~e.indexOf("random(")?Yr(e):e},Og=Mf+"repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert",zg={};pa(Og+",id,stagger,delay,duration,paused,scrollTrigger",function(i){return zg[i]=1});var kt=(function(i){hg(e,i);function e(a,n,r,s){var o;typeof n=="number"&&(r.duration=n,n=r,r=null),o=i.call(this,s?n:_o(n))||this;var l=o.vars,c=l.duration,u=l.delay,f=l.immediateRender,d=l.stagger,h=l.overwrite,x=l.keyframes,g=l.defaults,p=l.scrollTrigger,m=n.parent||Et,y=(la(a)||mg(a)?Hn(a[0]):"length"in n)?[a]:Ga(a),L,v,S,w,I,_,C,A;if(o._targets=y.length?Lf(y):So("GSAP target "+a+" not found. https://gsap.com",!ya.nullTargetWarn)||[],o._ptLookup=[],o._overwrite=h,x||d||Jc(c)||Jc(u)){n=o.vars;var E=n.easeReverse||n.yoyoEase;if(L=o.timeline=new oa({data:"nested",defaults:g||{},targets:m&&m.data==="nested"?m.vars.targets:y}),L.kill(),L.parent=L._dp=On(o),L._start=0,d||Jc(c)||Jc(u)){if(w=y.length,C=d&&Ag(d),Cn(d))for(I in d)~Og.indexOf(I)&&(A||(A={}),A[I]=d[I]);for(v=0;v<w;v++)S=au(n,zg),S.stagger=0,E&&(S.easeReverse=E),A&&Gr(S,A),_=y[v],S.duration=+bo(c,On(o),v,_,y),S.delay=(+bo(u,On(o),v,_,y)||0)-o._delay,!d&&w===1&&S.delay&&(o._delay=u=S.delay,o._start+=u,S.delay=0),L.to(_,S,C?C(v,_,y):0),L._ease=st.none;L.duration()?c=u=0:o.timeline=0}else if(x){_o(Ra(L.vars.defaults,{ease:"none"})),L._ease=Oi(x.ease||n.ease||"none");var F=0,U,R,B;if(la(x))x.forEach(function(q){return L.to(y,q,">")}),L.duration();else{S={};for(I in x)I==="ease"||I==="easeEach"||Lw(I,x[I],S,x.easeEach);for(I in S)for(U=S[I].sort(function(q,H){return q.t-H.t}),F=0,v=0;v<U.length;v++)R=U[v],B={ease:R.e,duration:(R.t-(v?U[v-1].t:0))/100*c},B[I]=R.v,L.to(y,B,F),F+=B.duration;L.duration()<c&&L.to({},{duration:c-L.duration()})}}c||o.duration(c=L.duration())}else o.timeline=0;return h===!0&&!_f&&(di=On(o),Et.killTweensOf(y),di=0),Ln(m,On(o),r),n.reversed&&o.reverse(),n.paused&&o.paused(!0),(f||!c&&!x&&o._start===At(m._time)&&ba(f)&&tw(On(o))&&m.data!=="nested")&&(o._tTime=-bt,o.render(Math.max(0,-u)||0)),p&&Lg(On(o),p),o}var t=e.prototype;return t.render=function(n,r,s){var o=this._time,l=this._tDur,c=this._dur,u=n<0,f=n>l-bt&&!u?l:n<bt?0:n,d,h,x,g,p,m,y,L;if(!c)nw(this,n,r,s);else if(f!==this._tTime||!n||s||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==u||this._lazy){if(d=f,L=this.timeline,this._repeat){if(g=c+this._rDelay,this._repeat<-1&&u)return this.totalTime(g*100+n,r,s);if(d=At(f%g),f===l?(x=this._repeat,d=c):(p=At(f/g),x=~~p,x&&x===p?(d=c,x--):d>c&&(d=c)),m=this._yoyo&&x&1,m&&(d=c-d),p=Wr(this._tTime,g),d===o&&!s&&this._initted&&x===p)return this._tTime=f,this;x!==p&&this.vars.repeatRefresh&&!m&&!this._lock&&d!==g&&this._initted&&(this._lock=s=1,this.render(At(g*x),!0).invalidate()._lock=0)}if(!this._initted){if(Cg(this,u?n:d,s,r,f))return this._tTime=0,this;if(o!==this._time&&!(s&&this.vars.repeatRefresh&&x!==p))return this;if(c!==this._dur)return this.render(n,r,s)}if(this._rEase){var v=d<o;if(v!==this._inv){var S=v?o:c-o;this._inv=v,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=o,this._invRecip=S?(v?-1:1)/S:0,this._invScale=v?-this.ratio:1-this.ratio,this._invEase=v?this._rEase:this._ease}this.ratio=y=this._invRatio+this._invScale*this._invEase((d-this._invTime)*this._invRecip)}else this.ratio=y=this._ease(d/c);if(this._from&&(this.ratio=y=1-y),this._tTime=f,this._time=d,!this._act&&this._ts&&(this._act=1,this._lazy=0),!o&&f&&!r&&!p&&(Aa(this,"onStart"),this._tTime!==f))return this;for(h=this._pt;h;)h.r(y,h.d),h=h._next;L&&L.render(n<0?n:L._dur*L._ease(d/this._dur),r,s)||this._startAt&&(this._zTime=n),this._onUpdate&&!r&&(u&&df(this,n,r,s),Aa(this,"onUpdate")),this._repeat&&x!==p&&this.vars.onRepeat&&!r&&this.parent&&Aa(this,"onRepeat"),(f===this._tDur||!f)&&this._tTime===f&&(u&&!this._onUpdate&&df(this,n,!0,!0),(n||!c)&&(f===this._tDur&&this._ts>0||!f&&this._ts<0)&&pi(this,1),!r&&!(u&&!o)&&(f||o||m)&&(Aa(this,f===l?"onComplete":"onReverseComplete",!0),this._prom&&!(f<l&&this.timeScale()>0)&&this._prom()))}return this},t.targets=function(){return this._targets},t.invalidate=function(n){return(!n||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(n),i.prototype.invalidate.call(this,n)},t.resetTo=function(n,r,s,o,l){Mo||va.wake(),this._ts||this.play();var c=Math.min(this._dur,(this._dp._time-this._start)*this._ts),u;return this._initted||Pf(this,c),u=this._ease(c/this._dur),ww(this,n,r,s,o,u,c,l)?this.resetTo(n,r,s,o,1):(cu(this,0),this.parent||wg(this._dp,this,"_first","_last",this._dp._sort?"_start":0),this.render(0))},t.kill=function(n,r){if(r===void 0&&(r="all"),!n&&(!r||r==="all"))return this._lazy=this._pt=0,this.parent?go(this):this.scrollTrigger&&this.scrollTrigger.kill(!!$t),this;if(this.timeline){var s=this.timeline.totalDuration();return this.timeline.killTweensOf(n,r,di&&di.vars.overwrite!==!0)._first||go(this),this.parent&&s!==this.timeline.totalDuration()&&qr(this,this._dur*this.timeline._tDur/s,0,1),this}var o=this._targets,l=n?Ga(n):o,c=this._ptLookup,u=this._pt,f,d,h,x,g,p,m;if((!r||r==="all")&&jS(o,l))return r==="all"&&(this._pt=0),go(this);for(f=this._op=this._op||[],r!=="all"&&(Wt(r)&&(g={},pa(r,function(y){return g[y]=1}),r=g),r=Mw(o,r)),m=o.length;m--;)if(~l.indexOf(o[m])){d=c[m],r==="all"?(f[m]=r,x=d,h={}):(h=f[m]=f[m]||{},x=r);for(g in x)p=d&&d[g],p&&((!("kill"in p.d)||p.d.kill(g)===!0)&&ou(this,p,"_pt"),delete d[g]),h!=="all"&&(h[g]=1)}return this._initted&&!this._pt&&u&&go(this),this},e.to=function(n,r){return new e(n,r,arguments[2])},e.from=function(n,r){return vo(1,arguments)},e.delayedCall=function(n,r,s,o){return new e(r,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:n,onComplete:r,onReverseComplete:r,onCompleteParams:s,onReverseCompleteParams:s,callbackScope:o})},e.fromTo=function(n,r,s){return vo(2,arguments)},e.set=function(n,r){return r.duration=0,r.repeatDelay||(r.repeat=0),new e(n,r)},e.killTweensOf=function(n,r,s){return Et.killTweensOf(n,r,s)},e})(Lo);Ra(kt.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0});pa("staggerTo,staggerFrom,staggerFromTo",function(i){kt[i]=function(){var e=new oa,t=hf.call(arguments,0);return t.splice(i==="staggerFromTo"?5:4,0,0),e[i].apply(e,t)}});var Df=function(e,t,a){return e[t]=a},Hg=function(e,t,a){return e[t](a)},Cw=function(e,t,a,n){return e[t](n.fp,a)},Iw=function(e,t,a){return e.setAttribute(t,a)},uu=function(e,t){return Pt(e[t])?Hg:ru(e[t])&&e.setAttribute?Iw:Df},Vg=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e6)/1e6,t)},Tw=function(e,t){return t.set(t.t,t.p,!!(t.s+t.c*e),t)},Ff=function(e,t){var a=t._pt,n="";if(!e&&t.b)n=t.b;else if(e===1&&t.e)n=t.e;else{for(;a;)n=a.p+(a.m?a.m(a.s+a.c*e):Math.round((a.s+a.c*e)*1e4)/1e4)+n,a=a._next;n+=t.c}t.set(t.t,t.p,n,t)},kf=function(e,t){for(var a=t._pt;a;)a.r(e,a.d),a=a._next},Aw=function(e,t,a,n){for(var r=this._pt,s;r;)s=r._next,r.p===n&&r.modifier(e,t,a),r=s},Ew=function(e){for(var t=this._pt,a,n;t;)n=t._next,t.p===e&&!t.op||t.op===e?ou(this,t,"_pt"):t.dep||(a=1),t=n;return!a},Rw=function(e,t,a,n){n.mSet(e,t,n.m.call(n.tween,a,n.mt),n)},Uf=function(e){for(var t=e._pt,a,n,r,s;t;){for(a=t._next,n=r;n&&n.pr>t.pr;)n=n._next;(t._prev=n?n._prev:s)?t._prev._next=t:r=t,(t._next=n)?n._prev=t:s=t,t=a}e._pt=r},ma=(function(){function i(t,a,n,r,s,o,l,c,u){this.t=a,this.s=r,this.c=s,this.p=n,this.r=o||Vg,this.d=l||this,this.set=c||Df,this.pr=u||0,this._next=t,t&&(t._prev=this)}var e=i.prototype;return e.modifier=function(a,n,r){this.mSet=this.mSet||this.set,this.set=Rw,this.m=a,this.mt=r,this.tween=n},i})();pa(Mf+"parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse",function(i){return wf[i]=1});Ea.TweenMax=Ea.TweenLite=kt;Ea.TimelineLite=Ea.TimelineMax=oa;Et=new oa({sortChildren:!1,defaults:yo,autoRemoveChildren:!0,id:"root",smoothChildTiming:!0});ya.stringFilter=Tf;var zi=[],jc={},Pw=[],fg=0,Dw=0,sf=function(e){return(jc[e]||Pw).map(function(t){return t()})},xf=function(){var e=Date.now(),t=[];e-fg>2&&(sf("matchMediaInit"),zi.forEach(function(a){var n=a.queries,r=a.conditions,s,o,l,c;for(o in n)s=Mn.matchMedia(n[o]).matches,s&&(l=1),s!==r[o]&&(r[o]=s,c=1);c&&(a.revert(),l&&t.push(a))}),sf("matchMediaRevert"),t.forEach(function(a){return a.onMatch(a,function(n){return a.add(null,n)})}),fg=e,sf("matchMedia"))},Gg=(function(){function i(t,a){this.selector=a&&pf(a),this.data=[],this._r=[],this.isReverted=!1,this.id=Dw++,t&&this.add(t)}var e=i.prototype;return e.add=function(a,n,r){Pt(a)&&(r=n,n=a,a=Pt);var s=this,o=function(){var c=It,u=s.selector,f;return c&&c!==s&&c.data.push(s),r&&(s.selector=pf(r)),It=s,f=n.apply(s,arguments),Pt(f)&&s._r.push(f),It=c,s.selector=u,s.isReverted=!1,f};return s.last=o,a===Pt?o(s,function(l){return s.add(null,l)}):a?s[a]=o:o},e.ignore=function(a){var n=It;It=null,a(this),It=n},e.getTweens=function(){var a=[];return this.data.forEach(function(n){return n instanceof i?a.push.apply(a,n.getTweens()):n instanceof kt&&!(n.parent&&n.parent.data==="nested")&&a.push(n)}),a},e.clear=function(){this._r.length=this.data.length=0},e.kill=function(a,n){var r=this;if(a?(function(){for(var o=r.getTweens(),l=r.data.length,c;l--;)c=r.data[l],c.data==="isFlip"&&(c.revert(),c.getChildren(!0,!0,!1).forEach(function(u){return o.splice(o.indexOf(u),1)}));for(o.map(function(u){return{g:u._dur||u._delay||u._sat&&!u._sat.vars.immediateRender?u.globalTime(0):-1/0,t:u}}).sort(function(u,f){return f.g-u.g||-1/0}).forEach(function(u){return u.t.revert(a)}),l=r.data.length;l--;)c=r.data[l],c instanceof oa?c.data!=="nested"&&(c.scrollTrigger&&c.scrollTrigger.revert(),c.kill()):!(c instanceof kt)&&c.revert&&c.revert(a);r._r.forEach(function(u){return u(a,r)}),r.isReverted=!0})():this.data.forEach(function(o){return o.kill&&o.kill()}),this.clear(),n)for(var s=zi.length;s--;)zi[s].id===this.id&&zi.splice(s,1)},e.revert=function(a){this.kill(a||{})},i})(),Fw=(function(){function i(t){this.contexts=[],this.scope=t,It&&It.data.push(this)}var e=i.prototype;return e.add=function(a,n,r){Cn(a)||(a={matches:a});var s=new Gg(0,r||this.scope),o=s.conditions={},l,c,u;It&&!s.selector&&(s.selector=It.selector),this.contexts.push(s),n=s.add("onMatch",n),s.queries=a;for(c in a)c==="all"?u=1:(l=Mn.matchMedia(a[c]),l&&(zi.indexOf(s)<0&&zi.push(s),(o[c]=l.matches)&&(u=1),l.addListener?l.addListener(xf):l.addEventListener("change",xf)));return u&&n(s,function(f){return s.add(null,f)}),this},e.revert=function(a){this.kill(a||{})},e.kill=function(a){this.contexts.forEach(function(n){return n.kill(a,!0)})},i})(),iu={registerPlugin:function(){for(var e=arguments.length,t=new Array(e),a=0;a<e;a++)t[a]=arguments[a];t.forEach(function(n){return kg(n)})},timeline:function(e){return new oa(e)},getTweensOf:function(e,t){return Et.getTweensOf(e,t)},getProperty:function(e,t,a,n){Wt(e)&&(e=Ga(e)[0]);var r=hi(e||{}).get,s=a?Sg:yg;return a==="native"&&(a=""),e&&(t?s((_a[t]&&_a[t].get||r)(e,t,a,n)):function(o,l,c){return s((_a[o]&&_a[o].get||r)(e,o,l,c))})},quickSetter:function(e,t,a){if(e=Ga(e),e.length>1){var n=e.map(function(u){return ca.quickSetter(u,t,a)}),r=n.length;return function(u){for(var f=r;f--;)n[f](u)}}e=e[0]||{};var s=_a[t],o=hi(e),l=o.harness&&(o.harness.aliases||{})[t]||t,c=s?function(u){var f=new s;Vr._pt=0,f.init(e,a?u+a:u,Vr,0,[e]),f.render(1,f),Vr._pt&&kf(1,Vr)}:o.set(e,l);return s?c:function(u){return c(e,l,a?u+a:u,o,1)}},quickTo:function(e,t,a){var n,r=ca.to(e,Ra((n={},n[t]="+=0.1",n.paused=!0,n.stagger=0,n),a||{})),s=function(l,c,u){return r.resetTo(t,l,c,u)};return s.tween=r,s},isTweening:function(e){return Et.getTweensOf(e,!0).length>0},defaults:function(e){return e&&e.ease&&(e.ease=Oi(e.ease,yo.ease)),og(yo,e||{})},config:function(e){return og(ya,e||{})},registerEffect:function(e){var t=e.name,a=e.effect,n=e.plugins,r=e.defaults,s=e.extendTimeline;(n||"").split(",").forEach(function(o){return o&&!_a[o]&&!Ea[o]&&So(t+" effect requires "+o+" plugin.")}),tf[t]=function(o,l,c){return a(Ga(o),Ra(l||{},r),c)},s&&(oa.prototype[t]=function(o,l,c){return this.add(tf[t](o,Cn(l)?l:(c=l)&&{},this),c)})},registerEase:function(e,t){st[e]=Oi(t)},parseEase:function(e,t){return arguments.length?Oi(e,t):st},getById:function(e){return Et.getById(e)},exportRoot:function(e,t){e===void 0&&(e={});var a=new oa(e),n,r;for(a.smoothChildTiming=ba(e.smoothChildTiming),Et.remove(a),a._dp=0,a._time=a._tTime=Et._time,n=Et._first;n;)r=n._next,(t||!(!n._dur&&n instanceof kt&&n.vars.onComplete===n._targets[0]))&&Ln(a,n,n._start-n._delay),n=r;return Ln(Et,a,0),a},context:function(e,t){return e?new Gg(e,t):It},matchMedia:function(e){return new Fw(e)},matchMediaRefresh:function(){return zi.forEach(function(e){var t=e.conditions,a,n;for(n in t)t[n]&&(t[n]=!1,a=1);a&&e.revert()})||xf()},addEventListener:function(e,t){var a=jc[e]||(jc[e]=[]);~a.indexOf(t)||a.push(t)},removeEventListener:function(e,t){var a=jc[e],n=a&&a.indexOf(t);n>=0&&a.splice(n,1)},utils:{wrap:dw,wrapYoyo:fw,distribute:Ag,random:Rg,snap:Eg,normalize:uw,getUnit:Qt,clamp:sw,splitColor:Ug,toArray:Ga,selector:pf,mapRange:Dg,pipe:lw,unitize:cw,interpolate:hw,shuffle:Tg},install:xg,effects:tf,ticker:va,updateRoot:oa.updateRoot,plugins:_a,globalTimeline:Et,core:{PropTween:ma,globals:_g,Tween:kt,Timeline:oa,Animation:Lo,getCache:hi,_removeLinkedListItem:ou,reverting:function(){return $t},context:function(e){return e&&It&&(It.data.push(e),e._ctx=It),It},suppressOverwrites:function(e){return _f=e}}};pa("to,from,fromTo,delayedCall,set,killTweensOf",function(i){return iu[i]=kt[i]});va.add(oa.updateRoot);Vr=iu.to({},{duration:0});var kw=function(e,t){for(var a=e._pt;a&&a.p!==t&&a.op!==t&&a.fp!==t;)a=a._next;return a},Uw=function(e,t){var a=e._targets,n,r,s;for(n in t)for(r=a.length;r--;)s=e._ptLookup[r][n],s&&(s=s.d)&&(s._pt&&(s=kw(s,n)),s&&s.modifier&&s.modifier(t[n],e,a[r],n))},of=function(e,t){return{name:e,headless:1,rawVars:1,init:function(n,r,s){s._onInit=function(o){var l,c;if(Wt(r)&&(l={},pa(r,function(u){return l[u]=1}),r=l),t){l={};for(c in r)l[c]=t(r[c]);r=l}Uw(o,r)}}}},ca=iu.registerPlugin({name:"attr",init:function(e,t,a,n,r){var s,o,l;this.tween=a;for(s in t)l=e.getAttribute(s)||"",o=this.add(e,"setAttribute",(l||0)+"",t[s],n,r,0,0,s),o.op=s,o.b=l,this._props.push(s)},render:function(e,t){for(var a=t._pt;a;)$t?a.set(a.t,a.p,a.b,a):a.r(e,a.d),a=a._next}},{name:"endArray",headless:1,init:function(e,t){for(var a=t.length;a--;)this.add(e,a,e[a]||0,t[a],0,0,0,0,0,1)}},of("roundProps",mf),of("modifiers"),of("snap",Eg))||iu;kt.version=oa.version=ca.version="3.15.0";gg=1;vf()&&Xr();var Nw=st.Power0,Bw=st.Power1,Ow=st.Power2,zw=st.Power3,Hw=st.Power4,Vw=st.Linear,Gw=st.Quad,Ww=st.Cubic,qw=st.Quart,Xw=st.Quint,Yw=st.Strong,Zw=st.Elastic,Kw=st.Back,Jw=st.SteppedEase,$w=st.Bounce,Qw=st.Sine,jw=st.Expo,eM=st.Circ;var Wg,gi,Kr,Vf,Yi,tM,qg,Gf,aM=function(){return typeof window<"u"},Gn={},Xi=180/Math.PI,Jr=Math.PI/180,Zr=Math.atan2,Xg=1e8,Wf=/([A-Z])/g,nM=/(left|right|width|margin|padding|x)/i,iM=/[\s,\(]\S/,In={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},Bf=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},rM=function(e,t){return t.set(t.t,t.p,e===1?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},sM=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},oM=function(e,t){return t.set(t.t,t.p,e===1?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},lM=function(e,t){var a=t.s+t.c*e;t.set(t.t,t.p,~~(a+(a<0?-.5:.5))+t.u,t)},ex=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},tx=function(e,t){return t.set(t.t,t.p,e!==1?t.b:t.e,t)},cM=function(e,t,a){return e.style[t]=a},uM=function(e,t,a){return e.style.setProperty(t,a)},dM=function(e,t,a){return e._gsap[t]=a},fM=function(e,t,a){return e._gsap.scaleX=e._gsap.scaleY=a},hM=function(e,t,a,n,r){var s=e._gsap;s.scaleX=s.scaleY=a,s.renderTransform(r,s)},pM=function(e,t,a,n,r){var s=e._gsap;s[t]=a,s.renderTransform(r,s)},Rt="transform",Sa=Rt+"Origin",mM=function i(e,t){var a=this,n=this.target,r=n.style,s=n._gsap;if(e in Gn&&r){if(this.tfm=this.tfm||{},e!=="transform")e=In[e]||e,~e.indexOf(",")?e.split(",").forEach(function(o){return a.tfm[o]=Vn(n,o)}):this.tfm[e]=s.x?s[e]:Vn(n,e),e===Sa&&(this.tfm.zOrigin=s.zOrigin);else return In.transform.split(",").forEach(function(o){return i.call(a,o,t)});if(this.props.indexOf(Rt)>=0)return;s.svg&&(this.svgo=n.getAttribute("data-svg-origin"),this.props.push(Sa,t,"")),e=Rt}(r||t)&&this.props.push(e,t,r[e])},ax=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},gM=function(){var e=this.props,t=this.target,a=t.style,n=t._gsap,r,s;for(r=0;r<e.length;r+=3)e[r+1]?e[r+1]===2?t[e[r]](e[r+2]):t[e[r]]=e[r+2]:e[r+2]?a[e[r]]=e[r+2]:a.removeProperty(e[r].substr(0,2)==="--"?e[r]:e[r].replace(Wf,"-$1").toLowerCase());if(this.tfm){for(s in this.tfm)n[s]=this.tfm[s];n.svg&&(n.renderTransform(),t.setAttribute("data-svg-origin",this.svgo||"")),r=Gf(),(!r||!r.isStart)&&!a[Rt]&&(ax(a),n.zOrigin&&a[Sa]&&(a[Sa]+=" "+n.zOrigin+"px",n.zOrigin=0,n.renderTransform()),n.uncache=1)}},nx=function(e,t){var a={target:e,props:[],revert:gM,save:mM};return e._gsap||ca.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(n){return a.save(n)}),a},ix,Of=function(e,t){var a=gi.createElementNS?gi.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):gi.createElement(e);return a&&a.style?a:gi.createElement(e)},Pa=function i(e,t,a){var n=getComputedStyle(e);return n[t]||n.getPropertyValue(t.replace(Wf,"-$1").toLowerCase())||n.getPropertyValue(t)||!a&&i(e,$r(t)||t,1)||""},Yg="O,Moz,ms,Ms,Webkit".split(","),$r=function(e,t,a){var n=t||Yi,r=n.style,s=5;if(e in r&&!a)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);s--&&!(Yg[s]+e in r););return s<0?null:(s===3?"ms":s>=0?Yg[s]:"")+e},zf=function(){aM()&&window.document&&(Wg=window,gi=Wg.document,Kr=gi.documentElement,Yi=Of("div")||{style:{}},tM=Of("div"),Rt=$r(Rt),Sa=Rt+"Origin",Yi.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",ix=!!$r("perspective"),Gf=ca.core.reverting,Vf=1)},Zg=function(e){var t=e.ownerSVGElement,a=Of("svg",t&&t.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),n=e.cloneNode(!0),r;n.style.display="block",a.appendChild(n),Kr.appendChild(a);try{r=n.getBBox()}catch{}return a.removeChild(n),Kr.removeChild(a),r},Kg=function(e,t){for(var a=t.length;a--;)if(e.hasAttribute(t[a]))return e.getAttribute(t[a])},rx=function(e){var t,a;try{t=e.getBBox()}catch{t=Zg(e),a=1}return t&&(t.width||t.height)||a||(t=Zg(e)),t&&!t.width&&!t.x&&!t.y?{x:+Kg(e,["x","cx","x1"])||0,y:+Kg(e,["y","cy","y1"])||0,width:0,height:0}:t},sx=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&rx(e))},_i=function(e,t){if(t){var a=e.style,n;t in Gn&&t!==Sa&&(t=Rt),a.removeProperty?(n=t.substr(0,2),(n==="ms"||t.substr(0,6)==="webkit")&&(t="-"+t),a.removeProperty(n==="--"?t:t.replace(Wf,"-$1").toLowerCase())):a.removeAttribute(t)}},xi=function(e,t,a,n,r,s){var o=new ma(e._pt,t,a,0,1,s?tx:ex);return e._pt=o,o.b=n,o.e=r,e._props.push(a),o},Jg={deg:1,rad:1,turn:1},xM={grid:1,flex:1},vi=function i(e,t,a,n){var r=parseFloat(a)||0,s=(a+"").trim().substr((r+"").length)||"px",o=Yi.style,l=nM.test(t),c=e.tagName.toLowerCase()==="svg",u=(c?"client":"offset")+(l?"Width":"Height"),f=100,d=n==="px",h=n==="%",x,g,p,m;if(n===s||!r||Jg[n]||Jg[s])return r;if(s!=="px"&&!d&&(r=i(e,t,a,"px")),m=e.getCTM&&sx(e),(h||s==="%")&&(Gn[t]||~t.indexOf("adius")))return x=m?e.getBBox()[l?"width":"height"]:e[u],Dt(h?r/x*f:r/100*x);if(o[l?"width":"height"]=f+(d?s:n),g=n!=="rem"&&~t.indexOf("adius")||n==="em"&&e.appendChild&&!c?e:e.parentNode,m&&(g=(e.ownerSVGElement||{}).parentNode),(!g||g===gi||!g.appendChild)&&(g=gi.body),p=g._gsap,p&&h&&p.width&&l&&p.time===va.time&&!p.uncache)return Dt(r/p.width*f);if(h&&(t==="height"||t==="width")){var y=e.style[t];e.style[t]=f+n,x=e[u],y?e.style[t]=y:_i(e,t)}else(h||s==="%")&&!xM[Pa(g,"display")]&&(o.position=Pa(e,"position")),g===e&&(o.position="static"),g.appendChild(Yi),x=Yi[u],g.removeChild(Yi),o.position="absolute";return l&&h&&(p=hi(g),p.time=va.time,p.width=g[u]),Dt(d?x*r/f:x&&r?f/x*r:0)},Vn=function(e,t,a,n){var r;return Vf||zf(),t in In&&t!=="transform"&&(t=In[t],~t.indexOf(",")&&(t=t.split(",")[0])),Gn[t]&&t!=="transform"?(r=Ao(e,n),r=t!=="transformOrigin"?r[t]:r.svg?r.origin:fu(Pa(e,Sa))+" "+r.zOrigin+"px"):(r=e.style[t],(!r||r==="auto"||n||~(r+"").indexOf("calc("))&&(r=du[t]&&du[t](e,t,a)||Pa(e,t)||Cf(e,t)||(t==="opacity"?1:0))),a&&!~(r+"").trim().indexOf(" ")?vi(e,t,r,a)+a:r},_M=function(e,t,a,n){if(!a||a==="none"){var r=$r(t,e,1),s=r&&Pa(e,r,1);s&&s!==a?(t=r,a=s):t==="borderColor"&&(a=Pa(e,"borderTopColor"))}var o=new ma(this._pt,e.style,t,0,1,Ff),l=0,c=0,u,f,d,h,x,g,p,m,y,L,v,S;if(o.b=a,o.e=n,a+="",n+="",n.substring(0,6)==="var(--"&&(n=Pa(e,n.substring(4,n.indexOf(")")))),n==="auto"&&(g=e.style[t],e.style[t]=n,n=Pa(e,t)||n,g?e.style[t]=g:_i(e,t)),u=[a,n],Tf(u),a=u[0],n=u[1],d=a.match(Hi)||[],S=n.match(Hi)||[],S.length){for(;f=Hi.exec(n);)p=f[0],y=n.substring(l,f.index),x?x=(x+1)%5:(y.substr(-5)==="rgba("||y.substr(-5)==="hsla(")&&(x=1),p!==(g=d[c++]||"")&&(h=parseFloat(g)||0,v=g.substr((h+"").length),p.charAt(1)==="="&&(p=Vi(h,p)+v),m=parseFloat(p),L=p.substr((m+"").length),l=Hi.lastIndex-L.length,L||(L=L||ya.units[t]||v,l===n.length&&(n+=L,o.e+=L)),v!==L&&(h=vi(e,t,g,L)||0),o._pt={_next:o._pt,p:y||c===1?y:",",s:h,c:m-h,m:x&&x<4||t==="zIndex"?Math.round:0});o.c=l<n.length?n.substring(l,n.length):""}else o.r=t==="display"&&n==="none"?tx:ex;return yf.test(n)&&(o.e=0),this._pt=o,o},$g={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},vM=function(e){var t=e.split(" "),a=t[0],n=t[1]||"50%";return(a==="top"||a==="bottom"||n==="left"||n==="right")&&(e=a,a=n,n=e),t[0]=$g[a]||a,t[1]=$g[n]||n,t.join(" ")},bM=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var a=t.t,n=a.style,r=t.u,s=a._gsap,o,l,c;if(r==="all"||r===!0)n.cssText="",l=1;else for(r=r.split(","),c=r.length;--c>-1;)o=r[c],Gn[o]&&(l=1,o=o==="transformOrigin"?Sa:Rt),_i(a,o);l&&(_i(a,Rt),s&&(s.svg&&a.removeAttribute("transform"),n.scale=n.rotate=n.translate="none",Ao(a,1),s.uncache=1,ax(n)))}},du={clearProps:function(e,t,a,n,r){if(r.data!=="isFromStart"){var s=e._pt=new ma(e._pt,t,a,0,0,bM);return s.u=n,s.pr=-10,s.tween=r,e._props.push(a),1}}},To=[1,0,0,1,0,0],ox={},lx=function(e){return e==="matrix(1, 0, 0, 1, 0, 0)"||e==="none"||!e},Qg=function(e){var t=Pa(e,Rt);return lx(t)?To:t.substr(7).match(bf).map(Dt)},qf=function(e,t){var a=e._gsap||hi(e),n=e.style,r=Qg(e),s,o,l,c;return a.svg&&e.getAttribute("transform")?(l=e.transform.baseVal.consolidate().matrix,r=[l.a,l.b,l.c,l.d,l.e,l.f],r.join(",")==="1,0,0,1,0,0"?To:r):(r===To&&!e.offsetParent&&e!==Kr&&!a.svg&&(l=n.display,n.display="block",s=e.parentNode,(!s||!e.offsetParent&&!e.getBoundingClientRect().width)&&(c=1,o=e.nextElementSibling,Kr.appendChild(e)),r=Qg(e),l?n.display=l:_i(e,"display"),c&&(o?s.insertBefore(e,o):s?s.appendChild(e):Kr.removeChild(e))),t&&r.length>6?[r[0],r[1],r[4],r[5],r[12],r[13]]:r)},Hf=function(e,t,a,n,r,s){var o=e._gsap,l=r||qf(e,!0),c=o.xOrigin||0,u=o.yOrigin||0,f=o.xOffset||0,d=o.yOffset||0,h=l[0],x=l[1],g=l[2],p=l[3],m=l[4],y=l[5],L=t.split(" "),v=parseFloat(L[0])||0,S=parseFloat(L[1])||0,w,I,_,C;a?l!==To&&(I=h*p-x*g)&&(_=v*(p/I)+S*(-g/I)+(g*y-p*m)/I,C=v*(-x/I)+S*(h/I)-(h*y-x*m)/I,v=_,S=C):(w=rx(e),v=w.x+(~L[0].indexOf("%")?v/100*w.width:v),S=w.y+(~(L[1]||L[0]).indexOf("%")?S/100*w.height:S)),n||n!==!1&&o.smooth?(m=v-c,y=S-u,o.xOffset=f+(m*h+y*g)-m,o.yOffset=d+(m*x+y*p)-y):o.xOffset=o.yOffset=0,o.xOrigin=v,o.yOrigin=S,o.smooth=!!n,o.origin=t,o.originIsAbsolute=!!a,e.style[Sa]="0px 0px",s&&(xi(s,o,"xOrigin",c,v),xi(s,o,"yOrigin",u,S),xi(s,o,"xOffset",f,o.xOffset),xi(s,o,"yOffset",d,o.yOffset)),e.setAttribute("data-svg-origin",v+" "+S)},Ao=function(e,t){var a=e._gsap||new Af(e);if("x"in a&&!t&&!a.uncache)return a;var n=e.style,r=a.scaleX<0,s="px",o="deg",l=getComputedStyle(e),c=Pa(e,Sa)||"0",u,f,d,h,x,g,p,m,y,L,v,S,w,I,_,C,A,E,F,U,R,B,q,H,te,Y,$,j,Ce,Me,Je,qe;return u=f=d=g=p=m=y=L=v=0,h=x=1,a.svg=!!(e.getCTM&&sx(e)),l.translate&&((l.translate!=="none"||l.scale!=="none"||l.rotate!=="none")&&(n[Rt]=(l.translate!=="none"?"translate3d("+(l.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+(l.rotate!=="none"?"rotate("+l.rotate+") ":"")+(l.scale!=="none"?"scale("+l.scale.split(" ").join(",")+") ":"")+(l[Rt]!=="none"?l[Rt]:"")),n.scale=n.rotate=n.translate="none"),I=qf(e,a.svg),a.svg&&(a.uncache?(te=e.getBBox(),c=a.xOrigin-te.x+"px "+(a.yOrigin-te.y)+"px",H=""):H=!t&&e.getAttribute("data-svg-origin"),Hf(e,H||c,!!H||a.originIsAbsolute,a.smooth!==!1,I)),S=a.xOrigin||0,w=a.yOrigin||0,I!==To&&(E=I[0],F=I[1],U=I[2],R=I[3],u=B=I[4],f=q=I[5],I.length===6?(h=Math.sqrt(E*E+F*F),x=Math.sqrt(R*R+U*U),g=E||F?Zr(F,E)*Xi:0,y=U||R?Zr(U,R)*Xi+g:0,y&&(x*=Math.abs(Math.cos(y*Jr))),a.svg&&(u-=S-(S*E+w*U),f-=w-(S*F+w*R))):(qe=I[6],Me=I[7],$=I[8],j=I[9],Ce=I[10],Je=I[11],u=I[12],f=I[13],d=I[14],_=Zr(qe,Ce),p=_*Xi,_&&(C=Math.cos(-_),A=Math.sin(-_),H=B*C+$*A,te=q*C+j*A,Y=qe*C+Ce*A,$=B*-A+$*C,j=q*-A+j*C,Ce=qe*-A+Ce*C,Je=Me*-A+Je*C,B=H,q=te,qe=Y),_=Zr(-U,Ce),m=_*Xi,_&&(C=Math.cos(-_),A=Math.sin(-_),H=E*C-$*A,te=F*C-j*A,Y=U*C-Ce*A,Je=R*A+Je*C,E=H,F=te,U=Y),_=Zr(F,E),g=_*Xi,_&&(C=Math.cos(_),A=Math.sin(_),H=E*C+F*A,te=B*C+q*A,F=F*C-E*A,q=q*C-B*A,E=H,B=te),p&&Math.abs(p)+Math.abs(g)>359.9&&(p=g=0,m=180-m),h=Dt(Math.sqrt(E*E+F*F+U*U)),x=Dt(Math.sqrt(q*q+qe*qe)),_=Zr(B,q),y=Math.abs(_)>2e-4?_*Xi:0,v=Je?1/(Je<0?-Je:Je):0),a.svg&&(H=e.getAttribute("transform"),a.forceCSS=e.setAttribute("transform","")||!lx(Pa(e,Rt)),H&&e.setAttribute("transform",H))),Math.abs(y)>90&&Math.abs(y)<270&&(r?(h*=-1,y+=g<=0?180:-180,g+=g<=0?180:-180):(x*=-1,y+=y<=0?180:-180)),t=t||a.uncache,a.x=u-((a.xPercent=u&&(!t&&a.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-u)?-50:0)))?e.offsetWidth*a.xPercent/100:0)+s,a.y=f-((a.yPercent=f&&(!t&&a.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-f)?-50:0)))?e.offsetHeight*a.yPercent/100:0)+s,a.z=d+s,a.scaleX=Dt(h),a.scaleY=Dt(x),a.rotation=Dt(g)+o,a.rotationX=Dt(p)+o,a.rotationY=Dt(m)+o,a.skewX=y+o,a.skewY=L+o,a.transformPerspective=v+s,(a.zOrigin=parseFloat(c.split(" ")[2])||!t&&a.zOrigin||0)&&(n[Sa]=fu(c)),a.xOffset=a.yOffset=0,a.force3D=ya.force3D,a.renderTransform=a.svg?SM:ix?cx:yM,a.uncache=0,a},fu=function(e){return(e=e.split(" "))[0]+" "+e[1]},Nf=function(e,t,a){var n=Qt(t);return Dt(parseFloat(t)+parseFloat(vi(e,"x",a+"px",n)))+n},yM=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,cx(e,t)},Wi="0deg",Io="0px",qi=") ",cx=function(e,t){var a=t||this,n=a.xPercent,r=a.yPercent,s=a.x,o=a.y,l=a.z,c=a.rotation,u=a.rotationY,f=a.rotationX,d=a.skewX,h=a.skewY,x=a.scaleX,g=a.scaleY,p=a.transformPerspective,m=a.force3D,y=a.target,L=a.zOrigin,v="",S=m==="auto"&&e&&e!==1||m===!0;if(L&&(f!==Wi||u!==Wi)){var w=parseFloat(u)*Jr,I=Math.sin(w),_=Math.cos(w),C;w=parseFloat(f)*Jr,C=Math.cos(w),s=Nf(y,s,I*C*-L),o=Nf(y,o,-Math.sin(w)*-L),l=Nf(y,l,_*C*-L+L)}p!==Io&&(v+="perspective("+p+qi),(n||r)&&(v+="translate("+n+"%, "+r+"%) "),(S||s!==Io||o!==Io||l!==Io)&&(v+=l!==Io||S?"translate3d("+s+", "+o+", "+l+") ":"translate("+s+", "+o+qi),c!==Wi&&(v+="rotate("+c+qi),u!==Wi&&(v+="rotateY("+u+qi),f!==Wi&&(v+="rotateX("+f+qi),(d!==Wi||h!==Wi)&&(v+="skew("+d+", "+h+qi),(x!==1||g!==1)&&(v+="scale("+x+", "+g+qi),y.style[Rt]=v||"translate(0, 0)"},SM=function(e,t){var a=t||this,n=a.xPercent,r=a.yPercent,s=a.x,o=a.y,l=a.rotation,c=a.skewX,u=a.skewY,f=a.scaleX,d=a.scaleY,h=a.target,x=a.xOrigin,g=a.yOrigin,p=a.xOffset,m=a.yOffset,y=a.forceCSS,L=parseFloat(s),v=parseFloat(o),S,w,I,_,C;l=parseFloat(l),c=parseFloat(c),u=parseFloat(u),u&&(u=parseFloat(u),c+=u,l+=u),l||c?(l*=Jr,c*=Jr,S=Math.cos(l)*f,w=Math.sin(l)*f,I=Math.sin(l-c)*-d,_=Math.cos(l-c)*d,c&&(u*=Jr,C=Math.tan(c-u),C=Math.sqrt(1+C*C),I*=C,_*=C,u&&(C=Math.tan(u),C=Math.sqrt(1+C*C),S*=C,w*=C)),S=Dt(S),w=Dt(w),I=Dt(I),_=Dt(_)):(S=f,_=d,w=I=0),(L&&!~(s+"").indexOf("px")||v&&!~(o+"").indexOf("px"))&&(L=vi(h,"x",s,"px"),v=vi(h,"y",o,"px")),(x||g||p||m)&&(L=Dt(L+x-(x*S+g*I)+p),v=Dt(v+g-(x*w+g*_)+m)),(n||r)&&(C=h.getBBox(),L=Dt(L+n/100*C.width),v=Dt(v+r/100*C.height)),C="matrix("+S+","+w+","+I+","+_+","+L+","+v+")",h.setAttribute("transform",C),y&&(h.style[Rt]=C)},wM=function(e,t,a,n,r){var s=360,o=Wt(r),l=parseFloat(r)*(o&&~r.indexOf("rad")?Xi:1),c=l-n,u=n+c+"deg",f,d;return o&&(f=r.split("_")[1],f==="short"&&(c%=s,c!==c%(s/2)&&(c+=c<0?s:-s)),f==="cw"&&c<0?c=(c+s*Xg)%s-~~(c/s)*s:f==="ccw"&&c>0&&(c=(c-s*Xg)%s-~~(c/s)*s)),e._pt=d=new ma(e._pt,t,a,n,c,rM),d.e=u,d.u="deg",e._props.push(a),d},jg=function(e,t){for(var a in t)e[a]=t[a];return e},MM=function(e,t,a){var n=jg({},a._gsap),r="perspective,force3D,transformOrigin,svgOrigin",s=a.style,o,l,c,u,f,d,h,x;n.svg?(c=a.getAttribute("transform"),a.setAttribute("transform",""),s[Rt]=t,o=Ao(a,1),_i(a,Rt),a.setAttribute("transform",c)):(c=getComputedStyle(a)[Rt],s[Rt]=t,o=Ao(a,1),s[Rt]=c);for(l in Gn)c=n[l],u=o[l],c!==u&&r.indexOf(l)<0&&(h=Qt(c),x=Qt(u),f=h!==x?vi(a,l,c,x):parseFloat(c),d=parseFloat(u),e._pt=new ma(e._pt,o,l,f,d-f,Bf),e._pt.u=x||0,e._props.push(l));jg(o,n)};pa("padding,margin,Width,Radius",function(i,e){var t="Top",a="Right",n="Bottom",r="Left",s=(e<3?[t,a,n,r]:[t+r,t+a,n+a,n+r]).map(function(o){return e<2?i+o:"border"+o+i});du[e>1?"border"+i:i]=function(o,l,c,u,f){var d,h;if(arguments.length<4)return d=s.map(function(x){return Vn(o,x,c)}),h=d.join(" "),h.split(d[0]).length===5?d[0]:h;d=(u+"").split(" "),h={},s.forEach(function(x,g){return h[x]=d[g]=d[g]||d[(g-1)/2|0]}),o.init(l,h,f)}});var Xf={name:"css",register:zf,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,a,n,r){var s=this._props,o=e.style,l=a.vars.startAt,c,u,f,d,h,x,g,p,m,y,L,v,S,w,I,_,C;Vf||zf(),this.styles=this.styles||nx(e),_=this.styles.props,this.tween=a;for(g in t)if(g!=="autoRound"&&(u=t[g],!(_a[g]&&Rf(g,t,a,n,e,r)))){if(h=typeof u,x=du[g],h==="function"&&(u=u.call(a,n,e,r),h=typeof u),h==="string"&&~u.indexOf("random(")&&(u=Yr(u)),x)x(this,e,g,u,a)&&(I=1);else if(g.substr(0,2)==="--")c=(getComputedStyle(e).getPropertyValue(g)+"").trim(),u+="",zn.lastIndex=0,zn.test(c)||(p=Qt(c),m=Qt(u),m?p!==m&&(c=vi(e,g,c,m)+m):p&&(u+=p)),this.add(o,"setProperty",c,u,n,r,0,0,g),s.push(g),_.push(g,0,o[g]);else if(h!=="undefined"){if(l&&g in l?(c=typeof l[g]=="function"?l[g].call(a,n,e,r):l[g],Wt(c)&&~c.indexOf("random(")&&(c=Yr(c)),Qt(c+"")||c==="auto"||(c+=ya.units[g]||Qt(Vn(e,g))||""),(c+"").charAt(1)==="="&&(c=Vn(e,g))):c=Vn(e,g),d=parseFloat(c),y=h==="string"&&u.charAt(1)==="="&&u.substr(0,2),y&&(u=u.substr(2)),f=parseFloat(u),g in In&&(g==="autoAlpha"&&(d===1&&Vn(e,"visibility")==="hidden"&&f&&(d=0),_.push("visibility",0,o.visibility),xi(this,o,"visibility",d?"inherit":"hidden",f?"inherit":"hidden",!f)),g!=="scale"&&g!=="transform"&&(g=In[g],~g.indexOf(",")&&(g=g.split(",")[0]))),L=g in Gn,L){if(this.styles.save(g),C=u,h==="string"&&u.substring(0,6)==="var(--"){if(u=Pa(e,u.substring(4,u.indexOf(")"))),u.substring(0,5)==="calc("){var A=e.style.perspective;e.style.perspective=u,u=Pa(e,"perspective"),A?e.style.perspective=A:_i(e,"perspective")}f=parseFloat(u)}if(v||(S=e._gsap,S.renderTransform&&!t.parseTransform||Ao(e,t.parseTransform),w=t.smoothOrigin!==!1&&S.smooth,v=this._pt=new ma(this._pt,o,Rt,0,1,S.renderTransform,S,0,-1),v.dep=1),g==="scale")this._pt=new ma(this._pt,S,"scaleY",S.scaleY,(y?Vi(S.scaleY,y+f):f)-S.scaleY||0,Bf),this._pt.u=0,s.push("scaleY",g),g+="X";else if(g==="transformOrigin"){_.push(Sa,0,o[Sa]),u=vM(u),S.svg?Hf(e,u,0,w,0,this):(m=parseFloat(u.split(" ")[2])||0,m!==S.zOrigin&&xi(this,S,"zOrigin",S.zOrigin,m),xi(this,o,g,fu(c),fu(u)));continue}else if(g==="svgOrigin"){Hf(e,u,1,w,0,this);continue}else if(g in ox){wM(this,S,g,d,y?Vi(d,y+u):u);continue}else if(g==="smoothOrigin"){xi(this,S,"smooth",S.smooth,u);continue}else if(g==="force3D"){S[g]=u;continue}else if(g==="transform"){MM(this,u,e);continue}}else g in o||(g=$r(g)||g);if(L||(f||f===0)&&(d||d===0)&&!iM.test(u)&&g in o)p=(c+"").substr((d+"").length),f||(f=0),m=Qt(u)||(g in ya.units?ya.units[g]:p),p!==m&&(d=vi(e,g,c,m)),this._pt=new ma(this._pt,L?S:o,g,d,(y?Vi(d,y+f):f)-d,!L&&(m==="px"||g==="zIndex")&&t.autoRound!==!1?lM:Bf),this._pt.u=m||0,L&&C!==u?(this._pt.b=c,this._pt.e=C,this._pt.r=oM):p!==m&&m!=="%"&&(this._pt.b=c,this._pt.r=sM);else if(g in o)_M.call(this,e,g,c,y?y+u:u);else if(g in e)this.add(e,g,c||e[g],y?y+u:u,n,r);else if(g!=="parseTransform"){su(g,u);continue}L||(g in o?_.push(g,0,o[g]):typeof e[g]=="function"?_.push(g,2,e[g]()):_.push(g,1,c||e[g])),s.push(g)}}I&&Uf(this)},render:function(e,t){if(t.tween._time||!Gf())for(var a=t._pt;a;)a.r(e,a.d),a=a._next;else t.styles.revert()},get:Vn,aliases:In,getSetter:function(e,t,a){var n=In[t];return n&&n.indexOf(",")<0&&(t=n),t in Gn&&t!==Sa&&(e._gsap.x||Vn(e,"x"))?a&&qg===a?t==="scale"?fM:dM:(qg=a||{})&&(t==="scale"?hM:pM):e.style&&!ru(e.style[t])?cM:~t.indexOf("-")?uM:uu(e,t)},core:{_removeProperty:_i,_getMatrix:qf}};ca.utils.checkPrefix=$r;ca.core.getStyleSaver=nx;(function(i,e,t,a){var n=pa(i+","+e+","+t,function(r){Gn[r]=1});pa(e,function(r){ya.units[r]="deg",ox[r]=1}),In[n[13]]=i+","+e,pa(a,function(r){var s=r.split(":");In[s[1]]=n[s[0]]})})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");pa("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(i){ya.units[i]="px"});ca.registerPlugin(Xf);var an=ca.registerPlugin(Xf)||ca,FA=an.core.Tween;an.ticker.sleep();function Wa(i){Ot(()=>{let e=i.current;if(!e||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;let t=Array.from(e.querySelectorAll("[data-reveal]")),a=an.context(()=>{an.set(t,{y:28,opacity:0})},e),n=new IntersectionObserver(r=>{for(let s of r){if(!s.isIntersecting)continue;n.unobserve(s.target);let o=s.target;a.add(()=>{an.to(o,{y:0,opacity:1,duration:.9,delay:Number(o.dataset.delay||0),ease:"power3.out",clearProps:"transform,opacity"})})}},{rootMargin:`0px 0px -${Math.round(window.innerHeight*.1)}px 0px`});return t.forEach(r=>n.observe(r)),()=>{n.disconnect(),a.revert()}},[i])}function ux({onDiscover:i,active:e,onSelect:t}){let a=gt[e];return re("div",{className:"hero-copy flex flex-col items-center px-5 text-center",style:er(e),children:[P("p",{"data-intro":!0,className:"hero-kicker",children:"NCR SUITE \xB7 LA PLATEFORME DE GESTION MULTI-M\xC9TIER"}),re("h1",{"data-intro":!0,className:"hero-title",children:["Une plateforme.",P("br",{}),P("span",{className:"text-slate-500",children:"Cinq exp\xE9riences m\xE9tier."})]}),P("p",{"data-intro":!0,className:"hero-description",children:"Votre activit\xE9 a ses propres contraintes. NCR Suite adapte ses outils et son environnement, sur un socle commun de gestion."}),P("div",{"data-intro":!0,className:"mt-5 w-full max-w-4xl",children:P(Kc,{active:e,onChange:t})}),re("div",{className:"hero-context","aria-live":"polite","aria-atomic":"true",children:[P("strong",{children:a?`NCR Suite \xB7 ${a.label}`:"Une marque. Un socle commun. Votre m\xE9tier."}),P("span",{children:a?a.features.join(" \xB7 "):"Choisissez votre m\xE9tier pour voir l\u2019interface et les usages s\u2019adapter."})]}),re("div",{"data-intro":!0,className:"hero-actions",children:[re("a",{href:cn,className:"btn btn-primary",children:["Essai gratuit de 7 jours ",P(Xa,{size:16,"aria-hidden":"true"})]}),P("button",{type:"button",onClick:i,className:"btn btn-ghost",children:"Explorer les cinq univers"})]}),re("p",{className:"mt-3 text-[0.65rem] leading-relaxed text-slate-500",children:["Essai Professionnelle apr\xE8s validation \xB7 Sans carte bancaire",P("br",{}),"Mockups illustratifs \xB7 Fonctions selon l\u2019offre et les modules"]})]})}function dx({c:i,i:e}){return re(Do,{children:[re("p",{className:"eyebrow mb-3",style:{color:i.accent},children:[i.label," \xB7 Univers ",e+1," / ",Kn.length]}),P("h2",{className:"text-[clamp(1.75rem,3.4vw,3.1rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink",children:i.title}),P("p",{className:"mt-3 text-[0.98rem] leading-relaxed text-slate-600 lg:mt-4 lg:text-[1.05rem]",children:i.text}),P("ul",{className:"mt-5 hidden space-y-2.5 lg:block",children:i.points.map(t=>re("li",{className:"flex items-center gap-3 text-[0.95rem] font-medium text-slate-800",children:[P("span",{className:"flex h-5 w-5 items-center justify-center rounded-full",style:{background:i.soft,color:i.accent},children:P(yi,{size:12,strokeWidth:3,"aria-hidden":"true"})}),t]},t))})]})}function Yf({activeVertical:i,onSelect:e,effects:t,views:a,images:n,onFail:r}){let s=at(null),o=at(null),l=at([]),c=at([]),u=at(null),f=at(null),d=at(null),h=at(null),x=at(-1),g=at(i);g.current=i;let p=at(null),m=at(e);m.current=e;let y=L=>{let v=s.current;if(!v)return;if(!t){document.getElementById(Kn[L-1]?.id??"plateforme")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});return}let S=v.offsetHeight-window.innerHeight,w=window.scrollY+v.getBoundingClientRect().top+L/5*S;window.scrollTo({top:w,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})};return Ot(()=>{if(!t||!a||!o.current||!s.current)return;let L=s.current,v=No(L),S=-1,w=F=>{if(Math.abs(S-F)<1e-4)return;S=F,l.current.forEach((R,B)=>{if(!R)return;let q=B===0?1-sa(.1,.4,F):1-sa(.2,.42,Math.abs(F-B)),H=B===0?-F*70:(B-F)*46;R.style.opacity=q.toFixed(3),R.style.transform=`translate3d(0,${H.toFixed(1)}px,0)`,R.style.pointerEvents=q>.5?"auto":"none",R.toggleAttribute("inert",q<.5)});let U=Math.round(F);if(p.current){let R=F>.5;p.current.style.opacity=R?"1":"0",p.current.inert=!R,p.current.style.pointerEvents=R?"auto":"none"}c.current.forEach((R,B)=>R&&(R.dataset.on=String(B===U))),u.current&&(u.current.style.opacity=(1-sa(.02,.22,F)).toFixed(3)),f.current&&(f.current.style.opacity=sa(.35,.8,F).toFixed(3)),h.current&&(h.current.style.transform=`scaleX(${(F/5).toFixed(4)})`),d.current&&U!==x.current&&(x.current=U,U>0&&m.current(U-1),d.current.textContent=U===0?"Introduction":`0${U} \u2014 ${Kn[U-1].title}`)},I=null;try{I=new Zc({canvas:o.current,views:a,mobile:window.innerWidth<1024,getHeroView:()=>g.current+1,getHeroBottom:()=>{let F=l.current[0],U=F?.parentElement;return F&&U?U.offsetTop+F.offsetTop+F.offsetHeight:0},getProgress:v.story,onFrame:w})}catch(F){console.warn("WebGL indisponible, version statique activ\xE9e.",F),v.dispose(),r();return}let _=new IntersectionObserver(([F])=>I?.setActive(F.isIntersecting),{rootMargin:"100px"});_.observe(L),w(0);let C=o.current,A=requestAnimationFrame(()=>{C.style.opacity="1"}),E=l.current[0]?an.from(l.current[0].querySelectorAll("[data-intro]"),{y:34,opacity:0,duration:1.1,stagger:.1,delay:.2,ease:"power3.out",clearProps:"transform,opacity"}):null;return()=>{cancelAnimationFrame(A),v.dispose(),E?.kill(),_.disconnect(),I?.dispose()}},[t,a,r]),t?P("section",{id:"plateforme",ref:s,"aria-label":"Pr\xE9sentation de la plateforme",className:"relative",style:{height:"575svh"},children:re("div",{className:"sticky top-0 h-[100svh] w-full overflow-hidden bg-gradient-to-b from-[#fbfcfe] via-[#f3f6fb] to-[#e9eef7]",children:[P("canvas",{ref:o,className:"absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ease-out",style:{opacity:0},"aria-hidden":"true"}),P("div",{className:"pointer-events-none absolute inset-x-0 top-0 pt-[5.5rem] lg:pt-28 [@media(max-height:820px)]:lg:!pt-24",children:P("div",{ref:L=>{l.current[0]=L},className:"will-change-transform",children:P(ux,{active:i,onSelect:e,onDiscover:()=>y(1)})})}),P("div",{ref:p,className:"story-selector absolute inset-x-4 top-20 z-20 opacity-0",inert:"",children:P(Kc,{active:i,overview:!1,onChange:L=>{e(L),y(L+1)},label:"Parcourir les cinq univers en 3D"})}),Kn.map((L,v)=>P("div",{id:L.id,className:`pointer-events-none absolute inset-x-4 bottom-5 lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:w-[min(28vw,420px)] ${v%2===0?"lg:left-[5vw]":"lg:right-[5vw]"}`,children:P("div",{ref:S=>{l.current[v+1]=S},className:"glass-m rounded-3xl p-5 opacity-0 will-change-transform sm:p-6 lg:p-0",children:P(dx,{c:L,i:v})})},L.id)),re("div",{ref:u,"aria-hidden":"true",className:"pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-500",children:["Faire d\xE9filer",P("span",{className:"relative block h-9 w-px overflow-hidden bg-slate-300",children:P("span",{className:"absolute inset-x-0 top-0 h-3 animate-[cue_1.8s_ease-in-out_infinite] bg-brand"})})]}),re("div",{ref:f,"aria-hidden":"true",className:"pointer-events-none absolute bottom-6 left-1/2 hidden w-[min(340px,40vw)] -translate-x-1/2 flex-col items-center gap-2.5 opacity-0 lg:flex",children:[P("span",{ref:d,className:"text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-600"}),P("span",{className:"block h-[3px] w-full overflow-hidden rounded-full bg-slate-300/60",children:P("span",{ref:h,className:"block h-full origin-left rounded-full bg-brand",style:{transform:"scaleX(0)"}})})]}),P("nav",{"aria-label":"S\xE9quences m\xE9tier",className:"absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex",children:[0,...Kn.map((L,v)=>v+1)].map(L=>P("button",{ref:v=>{c.current[L]=v},type:"button",onClick:()=>y(L),"aria-label":L===0?"Introduction":Kn[L-1].title,className:"group flex h-4 w-4 items-center justify-center",children:P("span",{className:"h-1.5 w-1.5 rounded-full bg-slate-400/60 transition-all duration-300 group-data-[on=true]:h-3 group-data-[on=true]:w-1.5 group-data-[on=true]:bg-brand group-hover:bg-brand"})},L))})]})}):re("section",{id:"plateforme",ref:s,"aria-label":"Pr\xE9sentation de la plateforme",className:"relative",children:[re("div",{className:"relative overflow-hidden bg-gradient-to-b from-[#fbfcfe] to-[#eef2f9] pb-16 pt-28 lg:pt-36",children:[P(ux,{active:i,onSelect:e,onDiscover:()=>y(1)}),P("div",{className:"mx-auto mt-8 w-[min(92vw,1000px)] max-[819px]:max-w-[480px]",children:P("div",{className:"rounded-[1.6rem] bg-[#14171d] p-2.5 shadow-[0_50px_100px_-30px_rgba(16,24,40,0.45)] sm:p-3.5",children:n?P("img",{src:n[i+1],alt:`Illustration NCR Suite \u2014 ${gt[i]?.label??"plateforme multi-m\xE9tier"}`,className:"preview-enter aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-2xl"},i):P("div",{className:"aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-2xl bg-slate-100"})})})]}),Kn.map((L,v)=>P("div",{id:L.id,className:v%2?"bg-[#f4f6fa]":"bg-white",children:re("div",{className:`mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24 ${v%2?"lg:[&>*:first-child]:order-2":""}`,children:[P("div",{children:P(dx,{c:L,i:v})}),P("div",{className:"max-[819px]:mx-auto max-[819px]:w-full max-[819px]:max-w-[480px] rounded-[1.4rem] bg-[#14171d] p-2 shadow-[0_40px_80px_-30px_rgba(16,24,40,0.4)] sm:p-3",children:n?P("img",{src:n[L.view],alt:`Illustration NCR Suite \u2014 ${L.title}, sans donn\xE9es r\xE9elles`,loading:"lazy",className:"aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-xl"}):P("div",{className:"aspect-[4/5] min-[820px]:aspect-[1.6] w-full rounded-xl bg-slate-100"})})]})},L.id))]})}function Zf(){let i=at(null);return Wa(i),P("section",{id:"socle",ref:i,"aria-labelledby":"socle-title",className:"relative overflow-hidden bg-paper py-24 lg:py-32",children:re("div",{className:"relative mx-auto w-[min(92vw,1180px)]",children:[re("div",{className:"mx-auto max-w-3xl text-center","data-reveal":!0,children:[P("p",{className:"eyebrow",children:"Une plateforme, plusieurs m\xE9tiers"}),re("h2",{id:"socle-title",className:"mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.07] tracking-[-0.035em]",children:["NCR Suite au centre.",P("br",{}),P("span",{className:"text-slate-500",children:"Votre m\xE9tier aux commandes."})]}),P("p",{className:"mt-5 text-lg leading-relaxed text-slate-600",children:"Le socle relie votre gestion. Chaque environnement organise les outils autour du travail r\xE9el de vos \xE9quipes."})]}),re("div",{className:"platform-hub","data-reveal":!0,children:[re("div",{className:"hub-brand",children:[P(ji,{}),P("span",{children:"LE SOCLE COMMUN"})]}),P("div",{className:"hub-branches",children:gt.map((e,t)=>{let a=jd[t];return re("div",{className:"hub-branch",style:{"--branch-accent":e.accent,"--branch-soft":e.soft},children:[P(a,{size:23,"aria-hidden":"true"}),P("strong",{children:e.label}),re("span",{children:[e.nav[1]," \xB7 ",e.nav[2]]})]},e.key)})}),P("ul",{className:"common-pillars","aria-label":"Fonctions du socle commun",children:Fo.map(e=>P("li",{children:e},e))})]}),P("p",{className:"mx-auto mt-7 max-w-2xl text-center text-sm leading-relaxed text-slate-600",children:"Le planning devient vacation, intervention, service ou rendez-vous. Les documents et les indicateurs suivent la m\xEAme logique : celle de votre activit\xE9, selon l\u2019offre et les modules activ\xE9s."})]})})}var LM={graduation:Si,shield:Tn,sparkles:Fa,utensils:on,scissors:wi};function CM({s:i}){let e=at(null),t=LM[i.icon];return re("article",{ref:e,onPointerMove:r=>{if(r.pointerType!=="mouse"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;let s=e.current;if(!s)return;let o=s.getBoundingClientRect(),l=(r.clientX-o.left)/o.width,c=(r.clientY-o.top)/o.height;s.classList.add("is-moving"),s.style.setProperty("--rx",`${((.5-c)*12).toFixed(2)}deg`),s.style.setProperty("--ry",`${((l-.5)*14).toFixed(2)}deg`),s.style.setProperty("--mx",`${(l*100).toFixed(1)}%`),s.style.setProperty("--my",`${(c*100).toFixed(1)}%`)},onPointerLeave:()=>{let r=e.current;r&&(r.classList.remove("is-moving"),r.style.setProperty("--rx","0deg"),r.style.setProperty("--ry","0deg"))},className:"tilt group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_40px_-24px_rgba(16,24,40,0.18)] hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_40px_70px_-28px_rgba(16,24,40,0.3)]",style:{"--accent":i.accent},children:[P("div",{"aria-hidden":"true",className:"pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.14] blur-2xl transition-opacity duration-500 group-hover:opacity-30",style:{background:i.accent}}),P("div",{"aria-hidden":"true",className:"pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",style:{background:"radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgba(255,255,255,0.9), transparent 55%)"}}),P("div",{className:"relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-500 group-hover:-translate-y-1",style:{background:`linear-gradient(145deg, ${i.accent}, ${i.accent}cc)`,boxShadow:`0 14px 28px -10px ${i.accent}99`,transform:"translateZ(56px)"},children:P(t,{size:26,strokeWidth:1.8,"aria-hidden":"true"})}),P("h3",{className:"relative mt-8 text-[1.35rem] font-semibold tracking-tight text-ink",style:{transform:"translateZ(36px)"},children:i.title}),P("p",{className:"relative mt-2.5 text-[0.95rem] leading-relaxed text-slate-600",style:{transform:"translateZ(22px)"},children:i.text}),re("div",{className:"relative mt-auto flex items-end justify-between gap-4 pt-7",style:{transform:"translateZ(30px)"},children:[P("ul",{className:"flex flex-wrap gap-1.5",children:i.tags.map(r=>P("li",{className:"rounded-full bg-slate-100 px-3 py-1 text-[0.74rem] font-medium text-slate-600",children:r},r))}),P("a",{href:`${ln}${i.path}`,"aria-label":`D\xE9couvrir NCR Suite ${i.title}`,className:"flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-300 group-hover:border-transparent group-hover:bg-(--c) group-hover:text-white",style:{"--c":i.accent},children:P(jr,{size:17,"aria-hidden":"true",className:"transition-transform duration-300 group-hover:rotate-12"})})]})]})}function Kf(){let i=at(null);return Wa(i),P("section",{id:"metiers",ref:i,"aria-labelledby":"metiers-title",className:"relative bg-white py-24 lg:py-36",children:re("div",{className:"mx-auto w-[min(92vw,1180px)]",children:[re("div",{className:"mx-auto max-w-3xl text-center",children:[P("p",{className:"eyebrow","data-reveal":!0,children:"Fonctions par m\xE9tier"}),P("h2",{id:"metiers-title","data-reveal":!0,"data-delay":"0.05",className:"mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]",children:"Les outils de votre quotidien."}),P("p",{"data-reveal":!0,"data-delay":"0.1",className:"mt-5 text-[1.05rem] leading-relaxed text-slate-600 lg:text-lg",children:"NCR Suite s\u2019adapte \xE0 votre secteur : une base solide et commune, des modules qui \xE9pousent vos pratiques, vos documents et votre vocabulaire. Les fonctions disponibles d\xE9pendent de votre formule et des modules activ\xE9s."})]}),P("div",{className:"metier-grid mt-14 grid gap-5 lg:mt-20 lg:gap-6",children:Yh.map((e,t)=>P("div",{"data-reveal":!0,"data-delay":t%3*.08,children:P(CM,{s:e})},e.title))})]})})}var IM="(min-width: 1024px) and (min-height: 760px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";function Jf({images:i,activeVertical:e,onSelect:t}){let a=at(null),n=at(null),r=at(null),[s,o]=wa(!1),[l,c]=wa(Math.max(0,e)),u=at(l),f=at(t);f.current=t;let d=at({top:0,travel:1,step:1}),h=at(()=>{});Ot(()=>{let g=window.matchMedia(IM),p=()=>o(g.matches);return p(),g.addEventListener("change",p),()=>g.removeEventListener("change",p)},[]),Ot(()=>{let g=a.current,p=n.current,m=0,y=!1,L=A=>{u.current!==A&&(u.current=A,c(A),f.current(A))},v=()=>{let A=p.firstElementChild;d.current={top:g.getBoundingClientRect().top+window.scrollY,travel:Math.max(1,g.offsetHeight-window.innerHeight),step:A?A.offsetWidth+24:1},w()},S=()=>{if(m=0,!y||document.hidden)return;let A=d.current,E=s?Math.max(0,Math.min(4,(window.scrollY-A.top)/A.travel*4)):Math.max(0,Math.min(4,p.scrollLeft/A.step));s&&(p.style.transform=`translate3d(${-E*A.step}px,0,0)`,Array.from(p.children).forEach((F,U)=>{let R=Math.min(1,Math.abs(U-E)),B=F;B.style.opacity=String(1-R*.45),B.style.transform=`scale(${1-R*.06})`})),r.current&&(r.current.style.transform=`scaleX(${(E+1)/5})`),L(Math.round(E))};function w(){!m&&y&&!document.hidden&&(m=requestAnimationFrame(S))}h.current=A=>{let E=window.matchMedia("(prefers-reduced-motion: reduce)").matches;s?window.scrollTo({top:d.current.top+d.current.travel*A/4,behavior:"smooth"}):p.scrollTo({left:d.current.step*A,behavior:E?"auto":"smooth"}),L(A)};let I=new IntersectionObserver(([A])=>{y=A.isIntersecting,y?(v(),w()):(cancelAnimationFrame(m),m=0)});I.observe(g);let _=new ResizeObserver(v);_.observe(g),_.observe(p);let C=()=>{document.hidden?(cancelAnimationFrame(m),m=0):w()};return window.addEventListener("scroll",w,{passive:!0}),p.addEventListener("scroll",w,{passive:!0}),document.addEventListener("visibilitychange",C),p.style.transform="",Array.from(p.children).forEach(A=>{A.style.cssText=""}),v(),()=>{cancelAnimationFrame(m),I.disconnect(),_.disconnect(),window.removeEventListener("scroll",w),p.removeEventListener("scroll",w),document.removeEventListener("visibilitychange",C)}},[s]),Ot(()=>{let g=Math.max(0,e);!s&&u.current!==g&&(u.current=g,c(g),n.current?.scrollTo({left:d.current.step*g,behavior:"auto"}))},[e,s]);let x=g=>{if(!["ArrowRight","ArrowLeft","Home","End"].includes(g.key))return;g.preventDefault();let p=g.key==="Home"?0:g.key==="End"?4:(l+(g.key==="ArrowRight"?1:4))%5;h.current(p),document.getElementById(`tab-${p+1}`)?.focus({preventScroll:!0})};return P("section",{id:"produit",ref:a,"aria-labelledby":"produit-title",className:`product-carousel ${s?"is-pinned":""}`,style:er(l),children:re("div",{className:"product-sticky",children:[re("div",{className:"product-heading",children:[P("p",{className:"eyebrow !text-[#6aa5ff]",children:"Produit"}),P("h2",{id:"produit-title",className:"mt-3 text-[clamp(2rem,3.7vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em]",children:"Un m\xEAme ADN. Des outils qui changent."}),P("p",{className:"mt-4 text-slate-400",children:"Un planning de vacations ne ressemble pas \xE0 un agenda de salon. Explorez cinq environnements avec leurs priorit\xE9s, leurs \xE9crans et leur vocabulaire. Mockups illustratifs ; fonctions selon l\u2019offre et les modules."})]}),P("div",{className:"product-window",children:P("div",{ref:n,className:"product-track","aria-label":"Les cinq interfaces m\xE9tier",children:gt.map((g,p)=>P("figure",{className:"product-slide","aria-label":g.label,children:P("div",{className:"product-device",children:i?P("img",{src:i[p+1],alt:`Illustration NCR Suite \u2014 ${g.label}, sans donn\xE9es r\xE9elles`,loading:"lazy",decoding:"async",draggable:!1}):P("div",{className:"product-placeholder"})})},g.key))})}),re("div",{className:"product-controls",children:[P("div",{role:"tablist","aria-label":"\xC9crans NCR Suite",onKeyDown:x,className:"flex flex-wrap justify-center gap-2",children:gt.map((g,p)=>P("button",{type:"button",role:"tab",id:`tab-${p+1}`,"aria-controls":"panel-caption","aria-selected":l===p,tabIndex:l===p?0:-1,onClick:()=>h.current(p),className:"rounded-full px-3 py-2 text-xs font-medium",style:{background:l===p?g.soft:"#ffffff0d",color:l===p?g.accent:"#cbd5e1"},children:g.label},g.key))}),P("div",{className:"product-progress","aria-hidden":"true",children:P("span",{ref:r})}),re("div",{id:"panel-caption",role:"tabpanel","aria-labelledby":`tab-${l+1}`,className:"product-caption",children:[re("strong",{style:{color:gt[l].soft},children:["0",l+1," \u2014 05 \xB7 ",gt[l].label]}),P("p",{className:"mt-1 text-sm text-slate-400",children:Zh[l+1].text})]})]})]})})}var TM={sparkles:Fa,layers:sn,globe:Zn,puzzle:as,shield:Tn};function $f(){let i=at(null);return Wa(i),P("section",{id:"avantages",ref:i,"aria-labelledby":"avantages-title",className:"bg-paper py-24 lg:py-36",children:re("div",{className:"mx-auto w-[min(92vw,1180px)]",children:[re("div",{className:"mx-auto max-w-3xl text-center",children:[P("p",{className:"eyebrow","data-reveal":!0,children:"Avantages"}),P("h2",{id:"avantages-title","data-reveal":!0,"data-delay":"0.05",className:"mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]",children:"Tout ce qu\u2019il faut. Rien de superflu."})]}),P("ul",{className:"mt-14 grid gap-4 md:grid-cols-6 lg:mt-20 lg:gap-5",children:Kh.map((e,t)=>{let a=TM[e.icon],n=t>=3;return re("li",{"data-reveal":!0,"data-delay":t%3*.07,className:`group relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(16,24,40,0.25)] lg:p-8 ${n?"md:col-span-3":"md:col-span-2"} ${t===4?"max-md:col-span-1":""}`,children:[P("div",{"aria-hidden":"true",className:"pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"}),P("div",{className:"relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white",children:P(a,{size:23,strokeWidth:1.8,"aria-hidden":"true"})}),P("h3",{className:"relative mt-7 text-[1.4rem] font-semibold tracking-tight",children:e.title}),P("p",{className:"relative mt-2.5 max-w-md text-[0.97rem] leading-relaxed text-slate-600",children:e.text})]},e.title)})})]})})}var Zi=[{key:"formation",name:"Formation",label:"Organismes de formation",icon:"graduation",color:"#0878f9",plans:[{key:"decouverte",name:"D\xE9couverte",monthlyPriceCents:3990,memberLimit:1,summary:"Structurer les sessions et automatiser les premiers documents.",highlights:["Programmes, stagiaires et sessions","Documents et attestations","\xC9margements vierges"]},{key:"essentielle",name:"Essentielle",monthlyPriceCents:6990,memberLimit:3,summary:"Digitaliser le parcours et pr\xE9senter chaque support \xE0 votre image.",highlights:["\xC9margement num\xE9rique","Documents et e-mails personnalis\xE9s","3 acc\xE8s inclus"],recommended:!0},{key:"professionnelle",name:"Professionnelle",monthlyPriceCents:9990,memberLimit:10,summary:"Piloter la qualit\xE9, les \xE9quipes et les dossiers complets.",highlights:["\xC9valuations automatis\xE9es","Dossiers de session et multi-site","R\xF4les et acc\xE8s \xE9quipe"]},{key:"metier",name:"M\xE9tier",monthlyPriceCents:14990,memberLimit:100,summary:"Composer une plateforme contractuelle adapt\xE9e \xE0 votre organisme.",highlights:["Modules et r\xF4les sur mesure","Marque blanche et domaine d\xE9di\xE9","Jusqu\u2019\xE0 100 acc\xE8s"],custom:!0}]},{key:"securite",name:"S\xE9curit\xE9 priv\xE9e",label:"Entreprises de s\xE9curit\xE9",icon:"shield",color:"#d92d20",plans:[{key:"decouverte",name:"D\xE9couverte",monthlyPriceCents:3990,memberLimit:1,summary:"Poser le socle op\xE9rationnel des sites, vacations et contrats.",highlights:["Planning des agents","Clients, sites et tarifs","Facturation programm\xE9e"]},{key:"essentielle",name:"Essentielle",monthlyPriceCents:6990,memberLimit:10,summary:"Relier le bureau aux agents et fiabiliser les remont\xE9es terrain.",highlights:["Portail agent et consignes","Rondes QR et main courante","10 agents connect\xE9s"],recommended:!0},{key:"professionnelle",name:"Professionnelle",monthlyPriceCents:8990,memberLimit:50,summary:"Superviser les op\xE9rations sensibles en temps r\xE9el.",highlights:["G\xE9olocalisation et PTI/SOS","Supervision temps r\xE9el","50 agents et r\xF4les avanc\xE9s"]},{key:"metier",name:"M\xE9tier",monthlyPriceCents:11990,memberLimit:100,summary:"Adapter la capacit\xE9, les agences et les processus de s\xE9curit\xE9.",highlights:["Multi-site et marque blanche","Modules et r\xF4les sur mesure","Jusqu\u2019\xE0 100 acc\xE8s"],custom:!0}]},{key:"nettoyage",name:"Nettoyage",label:"Propret\xE9 et multiservices",icon:"sparkles",color:"#07865c",plans:[{key:"decouverte",name:"D\xE9couverte",monthlyPriceCents:2990,memberLimit:1,summary:"Planifier les prestations et cadrer chaque site client.",highlights:["Clients, sites et affectations","Planning des interventions","Facturation programm\xE9e"]},{key:"essentielle",name:"Essentielle",monthlyPriceCents:4990,memberLimit:10,summary:"\xC9quiper les agents et produire des preuves directement sur site.",highlights:["Portail agent et pointage","Rapports et photos avant/apr\xE8s","10 agents connect\xE9s"],recommended:!0},{key:"professionnelle",name:"Professionnelle",monthlyPriceCents:7990,memberLimit:50,summary:"Mesurer la qualit\xE9, les anomalies et la rentabilit\xE9 multi-site.",highlights:["Contr\xF4les qualit\xE9 et anomalies","Stocks et statistiques","50 agents et multi-site"]},{key:"metier",name:"M\xE9tier",monthlyPriceCents:10990,memberLimit:100,summary:"Construire un environnement adapt\xE9 \xE0 vos contrats et \xE9quipes.",highlights:["Portail et processus sur mesure","Marque blanche et domaine d\xE9di\xE9","Jusqu\u2019\xE0 100 acc\xE8s"],custom:!0}]},{key:"restauration",name:"Restauration",label:"Restaurants et \xE9tablissements",icon:"utensils",color:"#b36a08",plans:[{key:"decouverte",name:"D\xE9couverte",monthlyPriceCents:2990,memberLimit:1,summary:"R\xE9unir l\u2019\xE9quipe, la carte, les r\xE9servations et les stocks simples.",highlights:["Planning et \xE9quipe","Carte, allerg\xE8nes et fournisseurs","R\xE9servations manuelles"]},{key:"essentielle",name:"Essentielle",monthlyPriceCents:4990,memberLimit:10,summary:"Fluidifier le service et rendre l\u2019exploitation plus autonome.",highlights:["R\xE9servation en ligne et plan de salle","Menu QR multilingue et HACCP","10 employ\xE9s connect\xE9s"],recommended:!0},{key:"professionnelle",name:"Professionnelle",monthlyPriceCents:7990,memberLimit:50,summary:"Piloter plusieurs sites, les stocks avanc\xE9s et la rentabilit\xE9.",highlights:["Supervision et multi-site","Inventaires et commandes fournisseurs","Food cost et statistiques"]},{key:"metier",name:"M\xE9tier",monthlyPriceCents:10990,memberLimit:100,summary:"\xC9quiper un groupe, une franchise ou un concept sp\xE9cifique.",highlights:["Groupes et franchises","Int\xE9grations et r\xF4les sur mesure","Jusqu\u2019\xE0 100 acc\xE8s"],custom:!0}]},{key:"coiffure",name:"Coiffure & beaut\xE9",label:"Salons et instituts",icon:"scissors",color:"#9b3db4",plans:[{key:"decouverte",name:"D\xE9couverte",monthlyPriceCents:990,memberLimit:1,summary:"Centraliser les clients, les prestations et les rendez-vous.",highlights:["Fichier client et prestations","R\xE9servation publique","Confirmations par e-mail"]},{key:"essentielle",name:"Essentielle",monthlyPriceCents:1990,memberLimit:3,summary:"Automatiser les rappels et ouvrir les premiers acc\xE8s \xE9quipe.",highlights:["Rappels automatiques","Gestion des r\xE9servations en ligne","3 acc\xE8s inclus"],recommended:!0},{key:"professionnelle",name:"Professionnelle",monthlyPriceCents:3990,memberLimit:10,summary:"Structurer l\u2019\xE9quipe et personnaliser la relation commerciale.",highlights:["R\xF4le manager et acc\xE8s \xE9quipe","Personnalisation commerciale","10 acc\xE8s inclus"]},{key:"metier",name:"M\xE9tier",monthlyPriceCents:6990,memberLimit:100,summary:"D\xE9ployer votre identit\xE9 et vos processus sur plusieurs salons.",highlights:["Multi-site et marque blanche","Domaine et modules sur mesure","Jusqu\u2019\xE0 100 acc\xE8s"],custom:!0}]}];var AM=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});function Qf({activeVertical:i,onSelect:e}){let t=at(null),a=Math.max(0,i),n=e;Wa(t);let r=s=>{if(!["ArrowRight","ArrowLeft","Home","End"].includes(s.key))return;s.preventDefault();let l=s.key==="Home"?0:s.key==="End"?Zi.length-1:(a+(s.key==="ArrowRight"?1:-1)+Zi.length)%Zi.length;n(l),document.getElementById(`offer-tab-${l}`)?.focus()};return re("section",{id:"offres",style:er(a),ref:t,"aria-labelledby":"offres-title",className:"relative overflow-hidden bg-paper py-24 lg:py-36",children:[P("div",{"aria-hidden":"true",className:"pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand/5 blur-3xl"}),re("div",{className:"relative mx-auto w-[min(92vw,1280px)]",children:[re("div",{className:"mx-auto max-w-3xl text-center","data-reveal":!0,children:[P("p",{className:"eyebrow",children:"Les offres NCR Suite"}),re("h2",{id:"offres-title",className:"mt-4 text-[clamp(2rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.035em]",children:["Votre m\xE9tier.",P("br",{}),P("span",{className:"text-slate-500",children:"Votre niveau d\u2019\xE9quipement."})]}),P("p",{className:"mt-5 text-lg leading-relaxed text-slate-600",children:"Un socle pour d\xE9marrer, des fonctions pour \xE9voluer. Retrouvez les formules de votre activit\xE9."})]}),P("div",{role:"tablist","aria-label":"Tarifs par m\xE9tier",onKeyDown:r,className:"mx-auto mt-10 flex w-fit max-w-full flex-wrap justify-center gap-2 rounded-3xl border border-slate-200 bg-white/70 p-2 shadow-sm",children:Zi.map((s,o)=>P("button",{id:`offer-tab-${o}`,role:"tab","aria-selected":a===o,"aria-controls":`offer-panel-${o}`,tabIndex:a===o?0:-1,onClick:()=>n(o),className:`min-h-11 rounded-full px-5 py-3 text-sm font-semibold transition ${a===o?"bg-[var(--vertical-accent)] text-white shadow-lg":"text-slate-600 hover:bg-slate-100"}`,children:s.name},s.key))}),Zi.map((s,o)=>re("div",{id:`offer-panel-${o}`,role:"tabpanel","aria-labelledby":`offer-tab-${o}`,hidden:a!==o,tabIndex:0,className:"mt-10",children:[re("div",{className:"mb-6 flex flex-wrap items-center justify-between gap-3 px-1",children:[re("p",{className:"text-lg font-semibold",children:[P("span",{className:"mr-2 inline-block h-2 w-2 rounded-full",style:{background:gt[o].accent}}),s.label]}),P("p",{className:"text-sm text-slate-600",children:"Prix HT / mois \xB7 Activation apr\xE8s validation"})]}),P("div",{className:"grid gap-4 sm:grid-cols-2 xl:grid-cols-4",children:s.plans.map(l=>re("article",{className:`relative flex min-w-0 flex-col rounded-[1.75rem] border p-6 transition duration-300 hover:-translate-y-1 lg:p-7 ${l.recommended?"border-[var(--vertical-accent)] bg-white shadow-[0_18px_60px_-28px_rgba(10,108,255,0.4)] ring-1 ring-[var(--vertical-accent)]":"border-slate-200 bg-white/85 shadow-sm"}`,children:[re("div",{className:"mb-5 flex h-6 items-center justify-between gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500",children:[P("span",{children:"NCR Suite"}),l.recommended&&P("span",{className:"rounded-full bg-[var(--vertical-soft)] px-2 py-1 text-[var(--vertical-accent)]",children:"Recommand\xE9e"}),l.custom&&P("span",{children:"Sur mesure"})]}),P("h3",{className:"text-xl font-semibold tracking-tight",children:l.name}),re("div",{className:"mt-5",children:[P("p",{className:"h-5 text-xs text-slate-600",children:l.custom?"\xC0 partir de":"Abonnement mensuel"}),re("p",{className:"mt-1 text-[2.6rem] font-semibold leading-tight tracking-[-0.05em]",children:[AM.format(l.monthlyPriceCents/100)," ",P("span",{className:"text-xl",children:"\u20AC"})]}),P("p",{className:"mt-1 text-sm text-slate-500",children:"HT / mois"})]}),P("p",{className:"mt-5 min-h-[4.5rem] text-sm leading-relaxed text-slate-600",children:l.summary}),re("p",{className:"mt-5 flex items-center gap-2 border-y border-slate-100 py-4 text-sm font-medium",children:[P(ns,{size:16,"aria-hidden":"true"}),l.memberLimit===1?"1 acc\xE8s inclus":`Jusqu\u2019\xE0 ${l.memberLimit} acc\xE8s`]}),P("ul",{className:"my-6 space-y-3 text-sm leading-relaxed text-slate-700",children:l.highlights.map(c=>re("li",{className:"flex items-start gap-2",children:[P(yi,{className:"mt-1 shrink-0 text-[var(--vertical-accent)]",size:14,"aria-hidden":"true"}),c]},c))}),re("a",{href:`${ln}/demande-acces?metier=${s.key}&offre=${l.key}&essai=7&utm_source=vitrine&utm_medium=cta&utm_campaign=essai-7-jours&utm_content=offre-${s.key}-${l.key}`,"aria-label":`Demander l\u2019essai gratuit \u2014 ${s.name}, offre ${l.name}`,className:`btn mt-auto !px-3 !text-sm ${l.recommended?"btn-primary":"btn-ghost"}`,children:["Essayer 7 jours ",P(Xa,{size:15,"aria-hidden":"true"})]})]},l.key))})]},s.key)),re("div",{className:"mt-8 grid gap-6 rounded-3xl border border-slate-200 bg-white/60 p-6 md:grid-cols-[1.3fr_1fr] md:p-8",children:[re("div",{children:[P("h3",{className:"font-semibold",children:"7 jours pour d\xE9couvrir votre environnement"}),P("p",{className:"mt-2 text-sm leading-relaxed text-slate-600",children:"Apr\xE8s validation de votre demande, l\u2019essai gratuit porte sur la formule Professionnelle, sans carte bancaire ni contrat d\u2019abonnement \xE0 signer au d\xE9marrage."}),re("a",{className:"mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand",href:cn,children:["Demander mon essai ",P(Xa,{size:14,"aria-hidden":"true"})]})]}),re("div",{children:[P("h3",{className:"font-semibold",children:"Des modules pour accompagner votre \xE9volution"}),P("p",{className:"mt-2 text-sm leading-relaxed text-slate-600",children:"Comparaison avec les modules \xE0 la carte et mont\xE9e en gamme signal\xE9e avant tout surco\xFBt. Pour M\xE9tier, la configuration et le tarif contractuel final sont d\xE9finis avant l\u2019ouverture."}),re("a",{href:`${ln}/#offres`,className:"mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand",children:["Consulter le catalogue officiel ",P(Xa,{size:14,"aria-hidden":"true"})]})]})]})]})]})}function jf(){let i=at(null);Wa(i);let[e,t]=wa(Uo[0].key);return P("section",{id:"faq",ref:i,"aria-labelledby":"faq-title",className:"bg-white py-24 lg:py-32",children:re("div",{className:"mx-auto w-[min(92vw,820px)]",children:[re("div",{className:"text-center",children:[P("p",{className:"eyebrow","data-reveal":!0,children:"Questions fr\xE9quentes"}),P("h2",{id:"faq-title","data-reveal":!0,"data-delay":"0.05",className:"mt-4 text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.06] tracking-[-0.03em]",children:"Tout ce qu\u2019il faut savoir."})]}),P("div",{className:"mt-12 divide-y divide-slate-200 border-y border-slate-200","data-reveal":!0,"data-delay":"0.1",children:Jh.map(a=>re("details",{className:"group py-1",children:[re("summary",{className:"flex cursor-pointer list-none items-center justify-between gap-6 rounded-xl py-5 text-left text-[1.05rem] font-semibold tracking-tight text-ink marker:hidden [&::-webkit-details-marker]:hidden",children:[a.q,P("span",{className:"flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition duration-300 group-open:rotate-45 group-open:bg-brand group-open:text-white",children:P(Qi,{size:17,"aria-hidden":"true"})})]}),P("p",{className:"max-w-2xl pb-6 pr-12 leading-relaxed text-slate-600",children:a.a})]},a.q))}),re("div",{className:"mt-12",children:[P("label",{htmlFor:"faq-business",className:"block text-sm font-semibold text-slate-700",children:"Les questions de votre m\xE9tier"}),P("select",{id:"faq-business",value:e,onChange:a=>t(a.target.value),className:"mt-3 w-full rounded-2xl border border-slate-200 bg-paper p-4 text-base font-medium",children:Uo.map(a=>P("option",{value:a.key,children:a.name},a.key))}),Uo.map(a=>P("div",{hidden:a.key!==e,className:"mt-5 divide-y divide-slate-200",children:a.items.map(n=>re("details",{className:"group py-1",children:[re("summary",{className:"flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-5 text-base font-semibold marker:hidden [&::-webkit-details-marker]:hidden",children:[n.q,P(Qi,{size:17,"aria-hidden":"true",className:"shrink-0 transition group-open:rotate-45"})]}),P("p",{className:"pb-6 leading-relaxed text-slate-600",children:n.a})]},n.q))},a.key)),P("p",{className:"mt-5 text-xs leading-relaxed text-slate-500",children:"Les fonctions d\xE9pendent de la formule et des modules activ\xE9s. Consultez les offres de votre m\xE9tier pour les inclusions."})]})]})})}function EM(i,e,t,a,n,r){let s=[],o=[[i+t-n,e+n,-90],[i+t-n,e+a-n,0],[i+n,e+a-n,90],[i+n,e+n,180]];for(let[l,c,u]of o)for(let f=0;f<=r;f++){let d=(u+90*f/r)*Math.PI/180,h=l+n*Math.cos(d),x=c+n*Math.sin(d);s.push([h,x-Mt.slope*h])}return s}function RM(i,e){let t=[];for(let a=0;a<i.length;a++){let n=i[a],r=i[(a+1)%i.length],s=Math.max(1,Math.ceil(Math.hypot(r[0]-n[0],r[1]-n[1])/e));for(let o=0;o<s;o++)t.push([n[0]+(r[0]-n[0])*o/s,n[1]+(r[1]-n[1])*o/s])}return t}function PM(i,e,t){let a=i.length,n=i.map(x=>Math.hypot(x[0]-e[0],x[1]-e[1])>t),r=-1;for(let x=0;x<a;x++)if(n[x]&&!n[(x-1+a)%a]){r=x;break}if(r<0)return i;let s=[];for(let x=0;x<a;x++){let g=(r+x)%a;if(!n[g])break;s.push(i[g])}let o=s[0],l=s[s.length-1],c=Math.atan2(o[1]-e[1],o[0]-e[0]),u=Math.atan2(l[1]-e[1],l[0]-e[0]),f=c-u;for(;f>Math.PI;)f-=Math.PI*2;for(;f<-Math.PI;)f+=Math.PI*2;let d=40,h=[];for(let x=0;x<=d;x++){let g=u+f*x/d;h.push([e[0]+t*Math.cos(g),e[1]+t*Math.sin(g)])}return[...s,...h]}var hu=class{constructor(e){Te(this,"o",e);Te(this,"renderer");Te(this,"scene",new kn);Te(this,"camera",new zt(35,1,.5,80));Te(this,"envRT");Te(this,"logo",new Ua);Te(this,"rings",[]);Te(this,"dust");Te(this,"glow");Te(this,"raf",0);Te(this,"active",!1);Te(this,"last",performance.now());Te(this,"time",0);Te(this,"p",0);Te(this,"mx",0);Te(this,"my",0);Te(this,"smx",0);Te(this,"smy",0);Te(this,"w",1);Te(this,"h",1);Te(this,"ro");Te(this,"onMove",e=>{e.pointerType==="mouse"&&(this.mx=e.clientX/window.innerWidth*2-1,this.my=e.clientY/window.innerHeight*2-1)});Te(this,"onVisibility",()=>{cancelAnimationFrame(this.raf),this.raf=0,this.active&&!document.hidden&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.loop))});Te(this,"loop",e=>{if(this.raf=requestAnimationFrame(this.loop),!this.active||document.hidden){cancelAnimationFrame(this.raf),this.raf=0;return}let t=Math.min(.05,Math.max(0,(e-this.last)/1e3));this.last=e,this.time+=t,this.p+=(this.o.getProgress()-this.p)*(1-Math.exp(-t*5)),this.smx+=(this.mx-this.smx)*(1-Math.exp(-t*3)),this.smy+=(this.my-this.smy)*(1-Math.exp(-t*3));let a=sa(0,1,this.p),n=window.innerWidth<1024,r=Math.tan(Fr.degToRad(this.camera.fov/2)),s=2.6/(.6*2*r*this.camera.aspect),o=Math.max(tn(15,10,a),n?s:0),l=Math.sin(this.time*.18)*.12+this.smx*.1,c=.06-this.smy*.04+(1-a)*.12;this.camera.position.set(o*Math.sin(l),o*Math.sin(c),o*Math.cos(l)),this.camera.lookAt(0,0,0),this.camera.setViewOffset(this.w,this.h,0,(n?.14:.1)*this.h,this.w,this.h),this.logo.rotation.y=Math.sin(this.time*.45)*.45+this.smx*.15,this.logo.rotation.x=Math.sin(this.time*.35)*.05,this.logo.parent.position.y=Math.sin(this.time*.8)*.05,this.rings.forEach((f,d)=>f.rotation.z+=t*(.05+d*.03)*(d%2?-1:1)),this.dust.rotation.y+=t*.02;let u=this.glow.material;u.opacity=.75+Math.sin(this.time*.7)*.1,this.renderer.render(this.scene,this.camera)});let{renderer:t,envMap:a,envRT:n}=Xc(e.canvas,e.mobile,.5);this.renderer=t,this.envRT=n,this.scene.environment=a,this.scene.environmentIntensity=.55,this.scene.fog=new ws(329484,12,30),this.build(),this.resize(),this.ro=new ResizeObserver(()=>this.resize()),this.ro.observe(e.canvas),e.mobile||window.addEventListener("pointermove",this.onMove,{passive:!0}),document.addEventListener("visibilitychange",this.onVisibility),this.onVisibility()}build(){let{scene:e,renderer:t}=this,a=this.o.mobile,n=new Ri(16777215,2.6);n.position.set(3,5,6),e.add(n);let r=new si(4033535,60,30);r.position.set(-5,1.5,-2),e.add(r);let s=new si(9419007,30,30);s.position.set(5,-2,3),e.add(s),e.add(new Pi(16777215,.15));let o=new Ws({color:15922683,metalness:.55,roughness:.22,clearcoat:1,clearcoatRoughness:.12}),l=.0076,c=Mt.barW/2,u=(Mt.yMin+Mt.yMax)/2,f=.2,d=.035,h=w=>{let I=new Cr;w.forEach(([C,A],E)=>{let F=(C-c)*l,U=-(A-u)*l;E===0?I.moveTo(F,U):I.lineTo(F,U)}),I.closePath();let _=new Hs(I,{depth:f,bevelEnabled:!0,bevelThickness:d,bevelSize:d,bevelOffset:-d,bevelSegments:a?3:6,curveSegments:1});return _.translate(0,0,-f/2),_},x=a?8:16;[[Mt.topY,0,!1],[Mt.midY,Mt.midX,!0],[Mt.botY,0,!1]].forEach(([w,I,_])=>{let C=EM(I,w,Mt.barW-I,Mt.barH,Mt.radius,x);_&&(C=PM(RM(C,1),[Mt.dot.x,Mt.dot.y],Mt.cut)),this.logo.add(new nt(h(C),o))});let p=new nt(new Vs(Mt.dot.r*l,40,28),new Na({color:683263,emissive:683263,emissiveIntensity:.9,roughness:.25}));p.scale.z=.62,p.position.set((Mt.dot.x-c)*l,-(Mt.dot.y-u)*l,0),this.logo.add(p);let m=new Ua;m.add(this.logo),e.add(m),this.glow=new nt(new ia(a?7:10,a?7:10),new na({map:po([[0,"rgba(40,120,255,0.38)"],[.35,"rgba(10,108,255,0.1)"],[1,"rgba(10,108,255,0)"]]),transparent:!0,depthWrite:!1,blending:Js,fog:!1,toneMapped:!1})),this.glow.position.z=-1.6,e.add(this.glow),[2.2,3.1,4.2].forEach((w,I)=>{let _=new nt(new Gs(w,.007,8,180),new na({color:8237567,transparent:!0,opacity:.4-I*.1,fog:!1}));_.rotation.x=Math.PI/2.25,_.rotation.y=.2*(I-1),this.rings.push(_),e.add(_)});let y=a?140:320,L=new Float32Array(y*3);for(let w=0;w<y;w++){let I=3+Math.random()*9,_=Math.random()*Math.PI*2,C=Math.acos(2*Math.random()-1);L[w*3]=I*Math.sin(C)*Math.cos(_),L[w*3+1]=I*Math.sin(C)*Math.sin(_)*.6,L[w*3+2]=I*Math.cos(C)-2}let v=new aa;v.setAttribute("position",new fa(L,3)),this.dust=new Es(v,new Mr({size:.035,color:11455487,transparent:!0,opacity:.55,depthWrite:!1})),e.add(this.dust),(a?[-.75,.75]:[-1.25,-.72,0,.72,1.25]).forEach((w,I)=>{let _=this.o.views[a?0:(I+1)%this.o.views.length],C=new nt(new ia(4*_.width/_.height,4),new na({map:mo(_,t),color:5594220,transparent:!0,opacity:.85,toneMapped:!1})),A=11;C.position.set(Math.sin(w)*A,(I%2?.6:-.4)+.3,-Math.cos(w)*A+1),C.rotation.y=-w*.92,e.add(C)})}resize(){let e=this.o.canvas;this.w=e.clientWidth||1,this.h=e.clientHeight||1,ho(this.renderer,this.w,this.h,this.o.mobile),this.renderer.setSize(this.w,this.h,!1),this.camera.aspect=this.w/this.h,this.camera.updateProjectionMatrix()}setActive(e){this.active!==e&&(this.active=e,this.onVisibility())}dispose(){cancelAnimationFrame(this.raf),document.removeEventListener("visibilitychange",this.onVisibility),this.ro.disconnect(),window.removeEventListener("pointermove",this.onMove),Yc(this.scene),this.envRT.dispose(),this.renderer.dispose(),this.renderer.forceContextLoss()}};function eh({effects:i,views:e,onFail:t}){let a=at(null),n=at(null);return Wa(a),Ot(()=>{if(!i||!e||!n.current||!a.current)return;let r=a.current,s=null,o=No(r),l=new IntersectionObserver(([c])=>{if(c.isIntersecting&&!s)try{s=new hu({canvas:n.current,views:e,mobile:window.innerWidth<1024,getProgress:o.final})}catch(u){console.warn("WebGL indisponible pour la sc\xE8ne finale.",u),t()}s?.setActive(c.isIntersecting)},{rootMargin:"120px"});return l.observe(r),()=>{l.disconnect(),o.dispose(),s?.dispose()}},[i,e,t]),re("section",{ref:a,id:"final","aria-labelledby":"final-title",className:"relative isolate overflow-hidden text-white",style:{background:"radial-gradient(900px 700px at 50% 35%, #0c1f45 0%, #05070c 65%)"},children:[i?P("canvas",{ref:n,className:"absolute inset-0 -z-10 h-full w-full","aria-hidden":"true"}):P("div",{"aria-hidden":"true",className:"absolute inset-x-0 top-[14%] -z-10 flex justify-center",children:re("div",{className:"relative",children:[P("div",{className:"absolute inset-0 -m-16 rounded-full bg-brand/30 blur-3xl"}),P(_u,{ink:"#ffffff",className:"relative h-36 w-auto sm:h-48"})]})}),P("div",{className:"pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-night via-night/70 to-transparent"}),re("div",{className:"relative mx-auto flex min-h-[100svh] w-[min(92vw,900px)] flex-col items-center justify-end pb-20 pt-32 text-center lg:min-h-[108svh]",children:[re("h2",{id:"final-title","data-reveal":!0,className:"text-[clamp(2.3rem,6.4vw,5.25rem)] font-semibold leading-[1.03] tracking-[-0.04em]",children:["Passez \xE0 une",P("br",{}),"gestion plus simple."]}),P("p",{"data-reveal":!0,"data-delay":"0.08",className:"mt-5 max-w-xl text-[1.05rem] leading-relaxed text-slate-400",children:"Pr\xE9sentez votre activit\xE9. Apr\xE8s validation, d\xE9couvrez la formule Professionnelle pendant 7 jours, sans carte bancaire."}),re("div",{"data-reveal":!0,"data-delay":"0.14",className:"mt-9 flex w-full flex-col items-center gap-6",children:[re("a",{href:cn,className:"btn btn-light !h-14 !px-8 !text-base",children:["Demander mon essai gratuit",P(Xa,{size:18,"aria-hidden":"true"})]}),re("a",{href:ko,className:"group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tracking-tight text-white backdrop-blur transition hover:border-white/25 hover:bg-white/10",children:[P(es,{size:22,className:"text-[#6aa5ff]","aria-hidden":"true"}),"contact@ncr-suite.fr"]})]})]})]})}function th(){return re("footer",{className:"bg-night text-slate-400",children:[re("div",{className:"mx-auto flex w-[min(92vw,1180px)] flex-col items-center justify-between gap-6 border-t border-white/10 py-10 md:flex-row",children:[re("div",{className:"flex flex-col items-center gap-3 md:items-start",children:[P(ji,{dark:!0}),P("p",{className:"text-[0.8rem] uppercase tracking-[0.16em] text-slate-400",children:"Une suite. Tous vos m\xE9tiers. Une seule plateforme."})]}),re("nav",{"aria-label":"Pied de page",className:"flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm",children:[P("a",{className:"hover:text-white",href:"#plateforme",children:"Plateforme"}),P("a",{className:"hover:text-white",href:"#metiers",children:"M\xE9tiers"}),P("a",{className:"hover:text-white",href:"#produit",children:"Produit"}),P("a",{className:"hover:text-white",href:"#offres",children:"Offres"}),P("a",{className:"hover:text-white",href:"#faq",children:"FAQ"}),P("a",{className:"hover:text-white",href:rs,children:"Se connecter"}),P("a",{className:"hover:text-white",href:cn,children:"Essai gratuit de 7 jours"}),P("a",{className:"hover:text-white",href:`${ln}/mentions-legales`,children:"Mentions l\xE9gales"}),P("a",{className:"hover:text-white",href:`${ln}/confidentialite`,children:"Confidentialit\xE9"}),P("a",{className:"font-semibold text-white",href:ko,children:"contact@ncr-suite.fr"})]})]}),re("p",{className:"pb-10 text-center text-xs text-slate-400",children:["\xA9 ",new Date().getFullYear()," NCR Suite \u2014 Tous droits r\xE9serv\xE9s."]})]})}var ah=(()=>{try{let i=document.createElement("canvas"),e=i.getContext("webgl2")||i.getContext("webgl");if(!e)return{available:!1,maxTexture:4096};let t=e.getParameter(e.MAX_TEXTURE_SIZE);return e.getExtension("WEBGL_lose_context")?.loseContext(),{available:!0,maxTexture:t}}catch{return{available:!1,maxTexture:4096}}})();function DM(){return Math.max(1.5,Math.min(2,ah.maxTexture/1024))}function FM(){let i=window.devicePixelRatio||1;return Math.max(1.75,Math.min(i>=3?2:1.75,ah.maxTexture/600))}var kM=i=>new Promise(e=>i.toBlob(t=>e(t?URL.createObjectURL(t):i.toDataURL("image/jpeg",.92)),"image/jpeg",.92));function nh(){let[i,e]=wa(()=>!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&ah.available&&!(window.innerHeight<540&&window.innerWidth<1024||window.innerHeight<700&&window.innerWidth<640)),[t,a]=wa(-1),[n,r]=wa(null),[s,o]=wa(()=>Qd());Ot(()=>{let c=window.matchMedia("(prefers-reduced-motion: reduce)"),u=()=>{c.matches&&e(!1)};return c.addEventListener("change",u),()=>c.removeEventListener("change",u)},[]),Ot(()=>{let c=()=>{o(Qd()),(window.innerHeight<540&&window.innerWidth<1024||window.innerHeight<700&&window.innerWidth<640)&&e(!1)};return window.addEventListener("resize",c),()=>window.removeEventListener("resize",c)},[]),Ot(()=>{let c=!1,u=new Set,f=g=>new Promise(p=>{let m=setTimeout(()=>{u.delete(m),p()},g);u.add(m)}),d=[],h=async g=>{let p=await kM(g);return c?URL.revokeObjectURL(p):d.push(p),p};return r(null),(async()=>{try{let p=document.fonts;p&&await Promise.race([Promise.all([400,500,600,700,800].map(m=>p.load(`${m} 16px NCRHomeInter`))),f(2500)])}catch{}if(c)return;let g=[];if(s){let p=FM();for(let y=0;y<$d;y++)if(g.push(ag(y,p)),await f(0),c)return;r({views:g,images:null});let m=await Promise.all(g.map(h));if(c)return;r({views:g,images:m})}else{let p=DM();for(let y=0;y<$d;y++)if(g.push(tg(y,p)),await f(0),c)return;r({views:g,images:null});let m=await Promise.all(g.map(h));c||r({views:g,images:m})}})().catch(()=>{c||e(!1)}),()=>{c=!0,u.forEach(clearTimeout),u.clear(),d.forEach(g=>URL.revokeObjectURL(g))}},[s]);let l=gh(()=>e(!1),[]);return re(Do,{children:[P(vu,{effects:i,onToggle:()=>e(c=>!c)}),re("main",{id:"contenu",children:[P(Yf,{activeVertical:t,onSelect:a,effects:i,views:n?.views??null,images:n?.images??null,onFail:l}),P(Zf,{}),P(Kf,{}),P(Jf,{activeVertical:t,onSelect:a,images:n?.images??null}),P($f,{}),P(Qf,{activeVertical:t,onSelect:a}),P(jf,{}),P(eh,{effects:i,views:n?.views??null,onFail:l})]}),P(th,{})]})}var fx='@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){#ncr-public-home *,#ncr-public-home :before,#ncr-public-home :after,#ncr-public-home ::backdrop{--ncr-home-tw-translate-x:0;--ncr-home-tw-translate-y:0;--ncr-home-tw-translate-z:0;--ncr-home-tw-rotate-x:initial;--ncr-home-tw-rotate-y:initial;--ncr-home-tw-rotate-z:initial;--ncr-home-tw-skew-x:initial;--ncr-home-tw-skew-y:initial;--ncr-home-tw-space-y-reverse:0;--ncr-home-tw-divide-y-reverse:0;--ncr-home-tw-border-style:solid;--ncr-home-tw-gradient-position:initial;--ncr-home-tw-gradient-from:#0000;--ncr-home-tw-gradient-via:#0000;--ncr-home-tw-gradient-to:#0000;--ncr-home-tw-gradient-stops:initial;--ncr-home-tw-gradient-via-stops:initial;--ncr-home-tw-gradient-from-position:0%;--ncr-home-tw-gradient-via-position:50%;--ncr-home-tw-gradient-to-position:100%;--ncr-home-tw-leading:initial;--ncr-home-tw-font-weight:initial;--ncr-home-tw-tracking:initial;--ncr-home-tw-shadow:0 0 #0000;--ncr-home-tw-shadow-color:initial;--ncr-home-tw-shadow-alpha:100%;--ncr-home-tw-inset-shadow:0 0 #0000;--ncr-home-tw-inset-shadow-color:initial;--ncr-home-tw-inset-shadow-alpha:100%;--ncr-home-tw-ring-color:initial;--ncr-home-tw-ring-shadow:0 0 #0000;--ncr-home-tw-inset-ring-color:initial;--ncr-home-tw-inset-ring-shadow:0 0 #0000;--ncr-home-tw-ring-inset:initial;--ncr-home-tw-ring-offset-width:0px;--ncr-home-tw-ring-offset-color:#fff;--ncr-home-tw-ring-offset-shadow:0 0 #0000;--ncr-home-tw-blur:initial;--ncr-home-tw-brightness:initial;--ncr-home-tw-contrast:initial;--ncr-home-tw-grayscale:initial;--ncr-home-tw-hue-rotate:initial;--ncr-home-tw-invert:initial;--ncr-home-tw-opacity:initial;--ncr-home-tw-saturate:initial;--ncr-home-tw-sepia:initial;--ncr-home-tw-drop-shadow:initial;--ncr-home-tw-drop-shadow-color:initial;--ncr-home-tw-drop-shadow-alpha:100%;--ncr-home-tw-drop-shadow-size:initial;--ncr-home-tw-backdrop-blur:initial;--ncr-home-tw-backdrop-brightness:initial;--ncr-home-tw-backdrop-contrast:initial;--ncr-home-tw-backdrop-grayscale:initial;--ncr-home-tw-backdrop-hue-rotate:initial;--ncr-home-tw-backdrop-invert:initial;--ncr-home-tw-backdrop-opacity:initial;--ncr-home-tw-backdrop-saturate:initial;--ncr-home-tw-backdrop-sepia:initial;--ncr-home-tw-duration:initial;--ncr-home-tw-ease:initial}}#ncr-public-home,#ncr-public-home{--font-sans:"NCRHomeInter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--font-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;--color-slate-100:oklch(96.8% .007 247.896);--color-slate-200:oklch(92.9% .013 255.508);--color-slate-300:oklch(86.9% .022 252.894);--color-slate-400:oklch(70.4% .04 256.788);--color-slate-500:oklch(55.4% .046 257.417);--color-slate-600:oklch(44.6% .043 257.281);--color-slate-700:oklch(37.2% .044 257.287);--color-slate-800:oklch(27.9% .041 260.031);--color-black:#000;--color-white:#fff;--spacing:.25rem;--container-md:28rem;--container-xl:36rem;--container-2xl:42rem;--container-3xl:48rem;--container-4xl:56rem;--container-6xl:72rem;--text-xs:.75rem;--text-xs--line-height:calc(1/.75);--text-sm:.875rem;--text-sm--line-height:calc(1.25/.875);--text-base:1rem;--text-base--line-height: 1.5 ;--text-lg:1.125rem;--text-lg--line-height:calc(1.75/1.125);--text-xl:1.25rem;--text-xl--line-height:calc(1.75/1.25);--font-weight-normal:400;--font-weight-medium:500;--font-weight-semibold:600;--font-weight-extrabold:800;--tracking-tight:-.025em;--tracking-widest:.1em;--leading-tight:1.25;--leading-relaxed:1.625;--radius-lg:.5rem;--radius-xl:.75rem;--radius-2xl:1rem;--radius-3xl:1.5rem;--ease-out:cubic-bezier(0,0,.2,1);--blur-md:12px;--blur-2xl:40px;--blur-3xl:64px;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4,0,.2,1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono);--color-brand:#0a6cff;--color-ink:#0b0d12;--color-paper:#f4f6fa;--color-night:#05070c}#ncr-public-home *,#ncr-public-home :after,#ncr-public-home :before,#ncr-public-home ::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}#ncr-public-home ::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}#ncr-public-home,#ncr-public-home{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}#ncr-public-home hr{height:0;color:inherit;border-top-width:1px}#ncr-public-home abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}#ncr-public-home h1,#ncr-public-home h2,#ncr-public-home h3,#ncr-public-home h4,#ncr-public-home h5,#ncr-public-home h6{font-size:inherit;font-weight:inherit}#ncr-public-home a{color:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}#ncr-public-home b,#ncr-public-home strong{font-weight:bolder}#ncr-public-home code,#ncr-public-home kbd,#ncr-public-home samp,#ncr-public-home pre{font-family:var(--default-mono-font-family,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}#ncr-public-home small{font-size:80%}#ncr-public-home sub,#ncr-public-home sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}#ncr-public-home sub{bottom:-.25em}#ncr-public-home sup{top:-.5em}#ncr-public-home table{text-indent:0;border-color:inherit;border-collapse:collapse}#ncr-public-home :-moz-focusring{outline:auto}#ncr-public-home progress{vertical-align:baseline}#ncr-public-home summary{display:list-item}#ncr-public-home ol,#ncr-public-home ul,#ncr-public-home menu{list-style:none}#ncr-public-home img,#ncr-public-home svg,#ncr-public-home video,#ncr-public-home canvas,#ncr-public-home audio,#ncr-public-home iframe,#ncr-public-home embed,#ncr-public-home object{vertical-align:middle;display:block}#ncr-public-home img,#ncr-public-home video{max-width:100%;height:auto}#ncr-public-home button,#ncr-public-home input,#ncr-public-home select,#ncr-public-home optgroup,#ncr-public-home textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}#ncr-public-home ::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}#ncr-public-home :where(select:is([multiple],[size])) optgroup{font-weight:bolder}#ncr-public-home :where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}#ncr-public-home ::file-selector-button{margin-inline-end:4px}#ncr-public-home ::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){#ncr-public-home ::placeholder{color:currentColor}@supports (color:color-mix(in lab,red,red)){#ncr-public-home ::placeholder{color:color-mix(in oklab,currentcolor 50%,transparent)}}}#ncr-public-home textarea{resize:vertical}#ncr-public-home ::-webkit-search-decoration{-webkit-appearance:none}#ncr-public-home ::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}#ncr-public-home ::-webkit-datetime-edit{display:inline-flex}#ncr-public-home ::-webkit-datetime-edit-fields-wrapper{padding:0}#ncr-public-home ::-webkit-datetime-edit{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-year-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-month-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-day-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-hour-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-minute-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-second-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-millisecond-field{padding-block:0}#ncr-public-home ::-webkit-datetime-edit-meridiem-field{padding-block:0}#ncr-public-home ::-webkit-calendar-picker-indicator{line-height:1}#ncr-public-home :-moz-ui-invalid{box-shadow:none}#ncr-public-home button,#ncr-public-home input:where([type=button],[type=reset],[type=submit]){appearance:button}#ncr-public-home ::file-selector-button{appearance:button}#ncr-public-home ::-webkit-inner-spin-button{height:auto}#ncr-public-home ::-webkit-outer-spin-button{height:auto}#ncr-public-home [hidden]:where(:not([hidden=until-found])){display:none!important}#ncr-public-home .pointer-events-none{pointer-events:none}#ncr-public-home .visible{visibility:visible}#ncr-public-home .absolute{position:absolute}#ncr-public-home .fixed{position:fixed}#ncr-public-home .relative{position:relative}#ncr-public-home .static{position:static}#ncr-public-home .sticky{position:sticky}#ncr-public-home .inset-0{inset:calc(var(--spacing)*0)}#ncr-public-home .inset-x-0{inset-inline:calc(var(--spacing)*0)}#ncr-public-home .inset-x-4{inset-inline:calc(var(--spacing)*4)}#ncr-public-home .-top-10{top:calc(var(--spacing)*-10)}#ncr-public-home .-top-16{top:calc(var(--spacing)*-16)}#ncr-public-home .-top-40{top:calc(var(--spacing)*-40)}#ncr-public-home .top-0{top:calc(var(--spacing)*0)}#ncr-public-home .top-1\\/2{top:50%}#ncr-public-home .top-3{top:calc(var(--spacing)*3)}#ncr-public-home .top-20{top:calc(var(--spacing)*20)}#ncr-public-home .top-\\[2px\\]{top:2px}#ncr-public-home .top-\\[14\\%\\]{top:14%}#ncr-public-home .-right-10{right:calc(var(--spacing)*-10)}#ncr-public-home .-right-16{right:calc(var(--spacing)*-16)}#ncr-public-home .right-5{right:calc(var(--spacing)*5)}#ncr-public-home .bottom-0{bottom:calc(var(--spacing)*0)}#ncr-public-home .bottom-5{bottom:calc(var(--spacing)*5)}#ncr-public-home .bottom-6{bottom:calc(var(--spacing)*6)}#ncr-public-home .left-1\\/2{left:50%}#ncr-public-home .left-4{left:calc(var(--spacing)*4)}#ncr-public-home .left-\\[2px\\]{left:2px}#ncr-public-home .left-\\[16px\\]{left:16px}#ncr-public-home .isolate{isolation:isolate}#ncr-public-home .-z-10{z-index:-10}#ncr-public-home .z-10{z-index:10}#ncr-public-home .z-20{z-index:20}#ncr-public-home .z-50{z-index:50}#ncr-public-home .-m-16{margin:calc(var(--spacing)*-16)}#ncr-public-home .mx-auto{margin-inline:auto}#ncr-public-home .my-6{margin-block:calc(var(--spacing)*6)}#ncr-public-home .mt-1{margin-top:calc(var(--spacing)*1)}#ncr-public-home .mt-2{margin-top:calc(var(--spacing)*2)}#ncr-public-home .mt-2\\.5{margin-top:calc(var(--spacing)*2.5)}#ncr-public-home .mt-3{margin-top:calc(var(--spacing)*3)}#ncr-public-home .mt-4{margin-top:calc(var(--spacing)*4)}#ncr-public-home .mt-5{margin-top:calc(var(--spacing)*5)}#ncr-public-home .mt-7{margin-top:calc(var(--spacing)*7)}#ncr-public-home .mt-8{margin-top:calc(var(--spacing)*8)}#ncr-public-home .mt-9{margin-top:calc(var(--spacing)*9)}#ncr-public-home .mt-10{margin-top:calc(var(--spacing)*10)}#ncr-public-home .mt-12{margin-top:calc(var(--spacing)*12)}#ncr-public-home .mt-14{margin-top:calc(var(--spacing)*14)}#ncr-public-home .mt-auto{margin-top:auto}#ncr-public-home .mr-2{margin-right:calc(var(--spacing)*2)}#ncr-public-home .mb-3{margin-bottom:calc(var(--spacing)*3)}#ncr-public-home .mb-5{margin-bottom:calc(var(--spacing)*5)}#ncr-public-home .mb-6{margin-bottom:calc(var(--spacing)*6)}#ncr-public-home .block{display:block}#ncr-public-home .contents{display:contents}#ncr-public-home .flex{display:flex}#ncr-public-home .grid{display:grid}#ncr-public-home .hidden{display:none}#ncr-public-home .inline-block{display:inline-block}#ncr-public-home .inline-flex{display:inline-flex}#ncr-public-home .aspect-\\[4\\/5\\]{aspect-ratio:4/5}#ncr-public-home .\\!h-9{height:calc(var(--spacing)*9)!important}#ncr-public-home .\\!h-14{height:calc(var(--spacing)*14)!important}#ncr-public-home .h-1\\.5{height:calc(var(--spacing)*1.5)}#ncr-public-home .h-1\\/2{height:50%}#ncr-public-home .h-2{height:calc(var(--spacing)*2)}#ncr-public-home .h-3{height:calc(var(--spacing)*3)}#ncr-public-home .h-4{height:calc(var(--spacing)*4)}#ncr-public-home .h-5{height:calc(var(--spacing)*5)}#ncr-public-home .h-6{height:calc(var(--spacing)*6)}#ncr-public-home .h-8{height:calc(var(--spacing)*8)}#ncr-public-home .h-9{height:calc(var(--spacing)*9)}#ncr-public-home .h-11{height:calc(var(--spacing)*11)}#ncr-public-home .h-12{height:calc(var(--spacing)*12)}#ncr-public-home .h-14{height:calc(var(--spacing)*14)}#ncr-public-home .h-36{height:calc(var(--spacing)*36)}#ncr-public-home .h-40{height:calc(var(--spacing)*40)}#ncr-public-home .h-56{height:calc(var(--spacing)*56)}#ncr-public-home .h-\\[3px\\]{height:3px}#ncr-public-home .h-\\[14px\\]{height:14px}#ncr-public-home .h-\\[18px\\]{height:18px}#ncr-public-home .h-\\[100svh\\]{height:100svh}#ncr-public-home .h-\\[600px\\]{height:600px}#ncr-public-home .h-full{height:100%}#ncr-public-home .min-h-11{min-height:calc(var(--spacing)*11)}#ncr-public-home .min-h-\\[4\\.5rem\\]{min-height:4.5rem}#ncr-public-home .min-h-\\[19rem\\]{min-height:19rem}#ncr-public-home .min-h-\\[100svh\\]{min-height:100svh}#ncr-public-home .w-1\\.5{width:calc(var(--spacing)*1.5)}#ncr-public-home .w-2{width:calc(var(--spacing)*2)}#ncr-public-home .w-4{width:calc(var(--spacing)*4)}#ncr-public-home .w-5{width:calc(var(--spacing)*5)}#ncr-public-home .w-8{width:calc(var(--spacing)*8)}#ncr-public-home .w-9{width:calc(var(--spacing)*9)}#ncr-public-home .w-11{width:calc(var(--spacing)*11)}#ncr-public-home .w-12{width:calc(var(--spacing)*12)}#ncr-public-home .w-14{width:calc(var(--spacing)*14)}#ncr-public-home .w-40{width:calc(var(--spacing)*40)}#ncr-public-home .w-56{width:calc(var(--spacing)*56)}#ncr-public-home .w-\\[14px\\]{width:14px}#ncr-public-home .w-\\[900px\\]{width:900px}#ncr-public-home .w-\\[min\\(92vw\\,820px\\)\\]{width:min(92vw,820px)}#ncr-public-home .w-\\[min\\(92vw\\,900px\\)\\]{width:min(92vw,900px)}#ncr-public-home .w-\\[min\\(92vw\\,1000px\\)\\]{width:min(92vw,1000px)}#ncr-public-home .w-\\[min\\(92vw\\,1180px\\)\\]{width:min(92vw,1180px)}#ncr-public-home .w-\\[min\\(92vw\\,1280px\\)\\]{width:min(92vw,1280px)}#ncr-public-home .w-\\[min\\(94vw\\,1180px\\)\\]{width:min(94vw,1180px)}#ncr-public-home .w-\\[min\\(340px\\,40vw\\)\\]{width:min(340px,40vw)}#ncr-public-home .w-auto{width:auto}#ncr-public-home .w-fit{width:fit-content}#ncr-public-home .w-full{width:100%}#ncr-public-home .w-px{width:1px}#ncr-public-home .max-w-2xl{max-width:var(--container-2xl)}#ncr-public-home .max-w-3xl{max-width:var(--container-3xl)}#ncr-public-home .max-w-4xl{max-width:var(--container-4xl)}#ncr-public-home .max-w-6xl{max-width:var(--container-6xl)}#ncr-public-home .max-w-full{max-width:100%}#ncr-public-home .max-w-md{max-width:var(--container-md)}#ncr-public-home .max-w-xl{max-width:var(--container-xl)}#ncr-public-home .min-w-0{min-width:calc(var(--spacing)*0)}#ncr-public-home .shrink-0{flex-shrink:0}#ncr-public-home .origin-left{transform-origin:0}#ncr-public-home .-translate-x-1\\/2{--ncr-home-tw-translate-x: -50% ;translate:var(--ncr-home-tw-translate-x)var(--ncr-home-tw-translate-y)}#ncr-public-home .-translate-y-1\\/2{--ncr-home-tw-translate-y: -50% ;translate:var(--ncr-home-tw-translate-x)var(--ncr-home-tw-translate-y)}#ncr-public-home .transform{transform:var(--ncr-home-tw-rotate-x,)var(--ncr-home-tw-rotate-y,)var(--ncr-home-tw-rotate-z,)var(--ncr-home-tw-skew-x,)var(--ncr-home-tw-skew-y,)}#ncr-public-home .animate-\\[cue_1\\.8s_ease-in-out_infinite\\]{animation:1.8s ease-in-out infinite ncr-home-cue}#ncr-public-home .cursor-pointer{cursor:pointer}#ncr-public-home .resize{resize:both}#ncr-public-home .list-none{list-style-type:none}#ncr-public-home .flex-col{flex-direction:column}#ncr-public-home .flex-wrap{flex-wrap:wrap}#ncr-public-home .items-center{align-items:center}#ncr-public-home .items-end{align-items:flex-end}#ncr-public-home .items-start{align-items:flex-start}#ncr-public-home .justify-between{justify-content:space-between}#ncr-public-home .justify-center{justify-content:center}#ncr-public-home .justify-end{justify-content:flex-end}#ncr-public-home .gap-1{gap:calc(var(--spacing)*1)}#ncr-public-home .gap-1\\.5{gap:calc(var(--spacing)*1.5)}#ncr-public-home .gap-2{gap:calc(var(--spacing)*2)}#ncr-public-home .gap-2\\.5{gap:calc(var(--spacing)*2.5)}#ncr-public-home .gap-3{gap:calc(var(--spacing)*3)}#ncr-public-home .gap-4{gap:calc(var(--spacing)*4)}#ncr-public-home .gap-5{gap:calc(var(--spacing)*5)}#ncr-public-home .gap-6{gap:calc(var(--spacing)*6)}#ncr-public-home .gap-10{gap:calc(var(--spacing)*10)}#ncr-public-home :where(.space-y-2\\.5>:not(:last-child)){--ncr-home-tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing)*2.5)*var(--ncr-home-tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing)*2.5)*calc(1 - var(--ncr-home-tw-space-y-reverse)))}#ncr-public-home :where(.space-y-3>:not(:last-child)){--ncr-home-tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing)*3)*var(--ncr-home-tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing)*3)*calc(1 - var(--ncr-home-tw-space-y-reverse)))}#ncr-public-home .gap-x-6{column-gap:calc(var(--spacing)*6)}#ncr-public-home .gap-y-2{row-gap:calc(var(--spacing)*2)}#ncr-public-home :where(.divide-y>:not(:last-child)){--ncr-home-tw-divide-y-reverse:0;border-bottom-style:var(--ncr-home-tw-border-style);border-top-style:var(--ncr-home-tw-border-style);border-top-width:calc(1px*var(--ncr-home-tw-divide-y-reverse));border-bottom-width:calc(1px*calc(1 - var(--ncr-home-tw-divide-y-reverse)))}#ncr-public-home :where(.divide-slate-200>:not(:last-child)){border-color:var(--color-slate-200)}#ncr-public-home .overflow-hidden{overflow:hidden}#ncr-public-home .rounded-2xl{border-radius:var(--radius-2xl)}#ncr-public-home .rounded-3xl{border-radius:var(--radius-3xl)}#ncr-public-home .rounded-\\[1\\.4rem\\]{border-radius:1.4rem}#ncr-public-home .rounded-\\[1\\.6rem\\]{border-radius:1.6rem}#ncr-public-home .rounded-\\[1\\.75rem\\]{border-radius:1.75rem}#ncr-public-home .rounded-full{border-radius:3.40282e38px}#ncr-public-home .rounded-lg{border-radius:var(--radius-lg)}#ncr-public-home .rounded-xl{border-radius:var(--radius-xl)}#ncr-public-home .border{border-style:var(--ncr-home-tw-border-style);border-width:1px}#ncr-public-home .border-y{border-block-style:var(--ncr-home-tw-border-style);border-block-width:1px}#ncr-public-home .border-t{border-top-style:var(--ncr-home-tw-border-style);border-top-width:1px}#ncr-public-home .border-\\[var\\(--vertical-accent\\)\\]{border-color:var(--vertical-accent)}#ncr-public-home .border-black\\/5{border-color:#0000000d}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .border-black\\/5{border-color:color-mix(in oklab,var(--color-black)5%,transparent)}}#ncr-public-home .border-slate-100{border-color:var(--color-slate-100)}#ncr-public-home .border-slate-200{border-color:var(--color-slate-200)}#ncr-public-home .border-slate-200\\/70{border-color:#e2e8f0b3}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .border-slate-200\\/70{border-color:color-mix(in oklab,var(--color-slate-200)70%,transparent)}}#ncr-public-home .border-slate-200\\/80{border-color:#e2e8f0cc}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .border-slate-200\\/80{border-color:color-mix(in oklab,var(--color-slate-200)80%,transparent)}}#ncr-public-home .border-transparent{border-color:#0000}#ncr-public-home .border-white\\/10{border-color:#ffffff1a}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .border-white\\/10{border-color:color-mix(in oklab,var(--color-white)10%,transparent)}}#ncr-public-home .border-white\\/70{border-color:#ffffffb3}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .border-white\\/70{border-color:color-mix(in oklab,var(--color-white)70%,transparent)}}#ncr-public-home .bg-\\[\\#14171d\\]{background-color:#14171d}#ncr-public-home .bg-\\[\\#f4f6fa\\]{background-color:#f4f6fa}#ncr-public-home .bg-\\[var\\(--vertical-accent\\)\\]{background-color:var(--vertical-accent)}#ncr-public-home .bg-\\[var\\(--vertical-soft\\)\\]{background-color:var(--vertical-soft)}#ncr-public-home .bg-brand{background-color:var(--color-brand)}#ncr-public-home .bg-brand\\/5{background-color:#0a6cff0d}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-brand\\/5{background-color:color-mix(in oklab,var(--color-brand)5%,transparent)}}#ncr-public-home .bg-brand\\/10{background-color:#0a6cff1a}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-brand\\/10{background-color:color-mix(in oklab,var(--color-brand)10%,transparent)}}#ncr-public-home .bg-brand\\/30{background-color:#0a6cff4d}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-brand\\/30{background-color:color-mix(in oklab,var(--color-brand)30%,transparent)}}#ncr-public-home .bg-night{background-color:var(--color-night)}#ncr-public-home .bg-paper{background-color:var(--color-paper)}#ncr-public-home .bg-slate-100{background-color:var(--color-slate-100)}#ncr-public-home .bg-slate-300{background-color:var(--color-slate-300)}#ncr-public-home .bg-slate-300\\/60{background-color:#cad5e299}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-slate-300\\/60{background-color:color-mix(in oklab,var(--color-slate-300)60%,transparent)}}#ncr-public-home .bg-slate-400\\/60{background-color:#90a1b999}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-slate-400\\/60{background-color:color-mix(in oklab,var(--color-slate-400)60%,transparent)}}#ncr-public-home .bg-transparent{background-color:#0000}#ncr-public-home .bg-white{background-color:var(--color-white)}#ncr-public-home .bg-white\\/5{background-color:#ffffff0d}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-white\\/5{background-color:color-mix(in oklab,var(--color-white)5%,transparent)}}#ncr-public-home .bg-white\\/60{background-color:#fff9}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-white\\/60{background-color:color-mix(in oklab,var(--color-white)60%,transparent)}}#ncr-public-home .bg-white\\/70{background-color:#ffffffb3}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-white\\/70{background-color:color-mix(in oklab,var(--color-white)70%,transparent)}}#ncr-public-home .bg-white\\/75{background-color:#ffffffbf}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-white\\/75{background-color:color-mix(in oklab,var(--color-white)75%,transparent)}}#ncr-public-home .bg-white\\/85{background-color:#ffffffd9}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-white\\/85{background-color:color-mix(in oklab,var(--color-white)85%,transparent)}}#ncr-public-home .bg-white\\/90{background-color:#ffffffe6}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .bg-white\\/90{background-color:color-mix(in oklab,var(--color-white)90%,transparent)}}#ncr-public-home .bg-gradient-to-b{--ncr-home-tw-gradient-position:to bottom in oklab;background-image:linear-gradient(var(--ncr-home-tw-gradient-stops))}#ncr-public-home .bg-gradient-to-t{--ncr-home-tw-gradient-position:to top in oklab;background-image:linear-gradient(var(--ncr-home-tw-gradient-stops))}#ncr-public-home .from-\\[\\#fbfcfe\\]{--ncr-home-tw-gradient-from:#fbfcfe;--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops,var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position))}#ncr-public-home .from-night{--ncr-home-tw-gradient-from:var(--color-night);--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops,var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position))}#ncr-public-home .via-\\[\\#f3f6fb\\]{--ncr-home-tw-gradient-via:#f3f6fb;--ncr-home-tw-gradient-via-stops:var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-via)var(--ncr-home-tw-gradient-via-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position);--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops)}#ncr-public-home .via-night\\/70{--ncr-home-tw-gradient-via:#05070cb3}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .via-night\\/70{--ncr-home-tw-gradient-via:color-mix(in oklab,var(--color-night)70%,transparent)}}#ncr-public-home .via-night\\/70{--ncr-home-tw-gradient-via-stops:var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-via)var(--ncr-home-tw-gradient-via-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position);--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops)}#ncr-public-home .to-\\[\\#e9eef7\\]{--ncr-home-tw-gradient-to:#e9eef7;--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops,var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position))}#ncr-public-home .to-\\[\\#eef2f9\\]{--ncr-home-tw-gradient-to:#eef2f9;--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops,var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position))}#ncr-public-home .to-transparent{--ncr-home-tw-gradient-to:transparent;--ncr-home-tw-gradient-stops:var(--ncr-home-tw-gradient-via-stops,var(--ncr-home-tw-gradient-position),var(--ncr-home-tw-gradient-from)var(--ncr-home-tw-gradient-from-position),var(--ncr-home-tw-gradient-to)var(--ncr-home-tw-gradient-to-position))}#ncr-public-home .p-2{padding:calc(var(--spacing)*2)}#ncr-public-home .p-2\\.5{padding:calc(var(--spacing)*2.5)}#ncr-public-home .p-3{padding:calc(var(--spacing)*3)}#ncr-public-home .p-4{padding:calc(var(--spacing)*4)}#ncr-public-home .p-5{padding:calc(var(--spacing)*5)}#ncr-public-home .p-6{padding:calc(var(--spacing)*6)}#ncr-public-home .p-7{padding:calc(var(--spacing)*7)}#ncr-public-home .\\!px-3{padding-inline:calc(var(--spacing)*3)!important}#ncr-public-home .\\!px-4{padding-inline:calc(var(--spacing)*4)!important}#ncr-public-home .\\!px-8{padding-inline:calc(var(--spacing)*8)!important}#ncr-public-home .px-1{padding-inline:calc(var(--spacing)*1)}#ncr-public-home .px-2{padding-inline:calc(var(--spacing)*2)}#ncr-public-home .px-3{padding-inline:calc(var(--spacing)*3)}#ncr-public-home .px-3\\.5{padding-inline:calc(var(--spacing)*3.5)}#ncr-public-home .px-4{padding-inline:calc(var(--spacing)*4)}#ncr-public-home .px-5{padding-inline:calc(var(--spacing)*5)}#ncr-public-home .px-6{padding-inline:calc(var(--spacing)*6)}#ncr-public-home .py-1{padding-block:calc(var(--spacing)*1)}#ncr-public-home .py-1\\.5{padding-block:calc(var(--spacing)*1.5)}#ncr-public-home .py-2{padding-block:calc(var(--spacing)*2)}#ncr-public-home .py-3{padding-block:calc(var(--spacing)*3)}#ncr-public-home .py-4{padding-block:calc(var(--spacing)*4)}#ncr-public-home .py-5{padding-block:calc(var(--spacing)*5)}#ncr-public-home .py-10{padding-block:calc(var(--spacing)*10)}#ncr-public-home .py-16{padding-block:calc(var(--spacing)*16)}#ncr-public-home .py-24{padding-block:calc(var(--spacing)*24)}#ncr-public-home .pt-2{padding-top:calc(var(--spacing)*2)}#ncr-public-home .pt-7{padding-top:calc(var(--spacing)*7)}#ncr-public-home .pt-28{padding-top:calc(var(--spacing)*28)}#ncr-public-home .pt-32{padding-top:calc(var(--spacing)*32)}#ncr-public-home .pt-\\[5\\.5rem\\]{padding-top:5.5rem}#ncr-public-home .pr-12{padding-right:calc(var(--spacing)*12)}#ncr-public-home .pb-6{padding-bottom:calc(var(--spacing)*6)}#ncr-public-home .pb-10{padding-bottom:calc(var(--spacing)*10)}#ncr-public-home .pb-16{padding-bottom:calc(var(--spacing)*16)}#ncr-public-home .pb-20{padding-bottom:calc(var(--spacing)*20)}#ncr-public-home .pl-5{padding-left:calc(var(--spacing)*5)}#ncr-public-home .text-center{text-align:center}#ncr-public-home .text-left{text-align:left}#ncr-public-home .\\!text-base{font-size:var(--text-base)!important;line-height:var(--ncr-home-tw-leading,var(--text-base--line-height))!important}#ncr-public-home .\\!text-sm{font-size:var(--text-sm)!important;line-height:var(--ncr-home-tw-leading,var(--text-sm--line-height))!important}#ncr-public-home .text-base{font-size:var(--text-base);line-height:var(--ncr-home-tw-leading,var(--text-base--line-height))}#ncr-public-home .text-lg{font-size:var(--text-lg);line-height:var(--ncr-home-tw-leading,var(--text-lg--line-height))}#ncr-public-home .text-sm{font-size:var(--text-sm);line-height:var(--ncr-home-tw-leading,var(--text-sm--line-height))}#ncr-public-home .text-xl{font-size:var(--text-xl);line-height:var(--ncr-home-tw-leading,var(--text-xl--line-height))}#ncr-public-home .text-xs{font-size:var(--text-xs);line-height:var(--ncr-home-tw-leading,var(--text-xs--line-height))}#ncr-public-home .\\!text-\\[0\\.85rem\\]{font-size:.85rem!important}#ncr-public-home .text-\\[0\\.8rem\\]{font-size:.8rem}#ncr-public-home .text-\\[0\\.65rem\\]{font-size:.65rem}#ncr-public-home .text-\\[0\\.68rem\\]{font-size:.68rem}#ncr-public-home .text-\\[0\\.72rem\\]{font-size:.72rem}#ncr-public-home .text-\\[0\\.74rem\\]{font-size:.74rem}#ncr-public-home .text-\\[0\\.78rem\\]{font-size:.78rem}#ncr-public-home .text-\\[0\\.88rem\\]{font-size:.88rem}#ncr-public-home .text-\\[0\\.95rem\\]{font-size:.95rem}#ncr-public-home .text-\\[0\\.97rem\\]{font-size:.97rem}#ncr-public-home .text-\\[0\\.98rem\\]{font-size:.98rem}#ncr-public-home .text-\\[1\\.4rem\\]{font-size:1.4rem}#ncr-public-home .text-\\[1\\.05rem\\]{font-size:1.05rem}#ncr-public-home .text-\\[1\\.15rem\\]{font-size:1.15rem}#ncr-public-home .text-\\[1\\.35rem\\]{font-size:1.35rem}#ncr-public-home .text-\\[2\\.6rem\\]{font-size:2.6rem}#ncr-public-home .text-\\[clamp\\(1\\.9rem\\,4vw\\,3rem\\)\\]{font-size:clamp(1.9rem,4vw,3rem)}#ncr-public-home .text-\\[clamp\\(1\\.25rem\\,3vw\\,1\\.75rem\\)\\]{font-size:clamp(1.25rem,3vw,1.75rem)}#ncr-public-home .text-\\[clamp\\(1\\.75rem\\,3\\.4vw\\,3\\.1rem\\)\\]{font-size:clamp(1.75rem,3.4vw,3.1rem)}#ncr-public-home .text-\\[clamp\\(2\\.3rem\\,6\\.4vw\\,5\\.25rem\\)\\]{font-size:clamp(2.3rem,6.4vw,5.25rem)}#ncr-public-home .text-\\[clamp\\(2rem\\,3\\.7vw\\,3\\.5rem\\)\\]{font-size:clamp(2rem,3.7vw,3.5rem)}#ncr-public-home .text-\\[clamp\\(2rem\\,4\\.6vw\\,3\\.75rem\\)\\]{font-size:clamp(2rem,4.6vw,3.75rem)}#ncr-public-home .leading-\\[1\\.03\\]{--ncr-home-tw-leading:1.03;line-height:1.03}#ncr-public-home .leading-\\[1\\.05\\]{--ncr-home-tw-leading:1.05;line-height:1.05}#ncr-public-home .leading-\\[1\\.06\\]{--ncr-home-tw-leading:1.06;line-height:1.06}#ncr-public-home .leading-\\[1\\.07\\]{--ncr-home-tw-leading:1.07;line-height:1.07}#ncr-public-home .leading-none{--ncr-home-tw-leading:1;line-height:1}#ncr-public-home .leading-relaxed{--ncr-home-tw-leading:var(--leading-relaxed);line-height:var(--leading-relaxed)}#ncr-public-home .leading-tight{--ncr-home-tw-leading:var(--leading-tight);line-height:var(--leading-tight)}#ncr-public-home .font-extrabold{--ncr-home-tw-font-weight:var(--font-weight-extrabold);font-weight:var(--font-weight-extrabold)}#ncr-public-home .font-medium{--ncr-home-tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}#ncr-public-home .font-normal{--ncr-home-tw-font-weight:var(--font-weight-normal);font-weight:var(--font-weight-normal)}#ncr-public-home .font-semibold{--ncr-home-tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}#ncr-public-home .tracking-\\[-0\\.03em\\]{--ncr-home-tw-tracking:-.03em;letter-spacing:-.03em}#ncr-public-home .tracking-\\[-0\\.04em\\]{--ncr-home-tw-tracking:-.04em;letter-spacing:-.04em}#ncr-public-home .tracking-\\[-0\\.05em\\]{--ncr-home-tw-tracking:-.05em;letter-spacing:-.05em}#ncr-public-home .tracking-\\[-0\\.035em\\]{--ncr-home-tw-tracking:-.035em;letter-spacing:-.035em}#ncr-public-home .tracking-\\[0\\.2em\\]{--ncr-home-tw-tracking:.2em;letter-spacing:.2em}#ncr-public-home .tracking-\\[0\\.16em\\]{--ncr-home-tw-tracking:.16em;letter-spacing:.16em}#ncr-public-home .tracking-tight{--ncr-home-tw-tracking:var(--tracking-tight);letter-spacing:var(--tracking-tight)}#ncr-public-home .tracking-widest{--ncr-home-tw-tracking:var(--tracking-widest);letter-spacing:var(--tracking-widest)}#ncr-public-home .\\!text-\\[\\#6aa5ff\\]{color:#6aa5ff!important}#ncr-public-home .text-\\[\\#6aa5ff\\]{color:#6aa5ff}#ncr-public-home .text-\\[var\\(--vertical-accent\\)\\]{color:var(--vertical-accent)}#ncr-public-home .text-brand{color:var(--color-brand)}#ncr-public-home .text-ink{color:var(--color-ink)}#ncr-public-home .text-slate-400{color:var(--color-slate-400)}#ncr-public-home .text-slate-500{color:var(--color-slate-500)}#ncr-public-home .text-slate-600{color:var(--color-slate-600)}#ncr-public-home .text-slate-700{color:var(--color-slate-700)}#ncr-public-home .text-slate-800{color:var(--color-slate-800)}#ncr-public-home .text-white{color:var(--color-white)}#ncr-public-home .uppercase{text-transform:uppercase}#ncr-public-home .opacity-0{opacity:0}#ncr-public-home .opacity-\\[0\\.14\\]{opacity:.14}#ncr-public-home .shadow{--ncr-home-tw-shadow:0 1px 3px 0 var(--ncr-home-tw-shadow-color,#0000001a),0 1px 2px -1px var(--ncr-home-tw-shadow-color,#0000001a);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-\\[0_1px_2px_rgba\\(16\\,24\\,40\\,0\\.04\\)\\,0_18px_40px_-24px_rgba\\(16\\,24\\,40\\,0\\.18\\)\\]{--ncr-home-tw-shadow:0 1px 2px var(--ncr-home-tw-shadow-color,#1018280a),0 18px 40px -24px var(--ncr-home-tw-shadow-color,#1018282e);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-\\[0_1px_2px_rgba\\(16\\,24\\,40\\,0\\.04\\)\\]{--ncr-home-tw-shadow:0 1px 2px var(--ncr-home-tw-shadow-color,#1018280a);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-\\[0_10px_40px_-16px_rgba\\(16\\,24\\,40\\,0\\.3\\)\\]{--ncr-home-tw-shadow:0 10px 40px -16px var(--ncr-home-tw-shadow-color,#1018284d);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-\\[0_18px_60px_-28px_rgba\\(10\\,108\\,255\\,0\\.4\\)\\]{--ncr-home-tw-shadow:0 18px 60px -28px var(--ncr-home-tw-shadow-color,#0a6cff66);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-\\[0_40px_80px_-30px_rgba\\(16\\,24\\,40\\,0\\.4\\)\\]{--ncr-home-tw-shadow:0 40px 80px -30px var(--ncr-home-tw-shadow-color,#10182866);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-\\[0_50px_100px_-30px_rgba\\(16\\,24\\,40\\,0\\.45\\)\\]{--ncr-home-tw-shadow:0 50px 100px -30px var(--ncr-home-tw-shadow-color,#10182873);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-lg{--ncr-home-tw-shadow:0 10px 15px -3px var(--ncr-home-tw-shadow-color,#0000001a),0 4px 6px -4px var(--ncr-home-tw-shadow-color,#0000001a);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-sm{--ncr-home-tw-shadow:0 1px 3px 0 var(--ncr-home-tw-shadow-color,#0000001a),0 1px 2px -1px var(--ncr-home-tw-shadow-color,#0000001a);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .shadow-xl{--ncr-home-tw-shadow:0 20px 25px -5px var(--ncr-home-tw-shadow-color,#0000001a),0 8px 10px -6px var(--ncr-home-tw-shadow-color,#0000001a);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .ring,#ncr-public-home .ring-1{--ncr-home-tw-ring-shadow:var(--ncr-home-tw-ring-inset,)0 0 0 calc(1px + var(--ncr-home-tw-ring-offset-width))var(--ncr-home-tw-ring-color,currentcolor);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .ring-\\[var\\(--vertical-accent\\)\\]{--ncr-home-tw-ring-color:var(--vertical-accent)}#ncr-public-home .blur-2xl{--ncr-home-tw-blur:blur(var(--blur-2xl));filter:var(--ncr-home-tw-blur,)var(--ncr-home-tw-brightness,)var(--ncr-home-tw-contrast,)var(--ncr-home-tw-grayscale,)var(--ncr-home-tw-hue-rotate,)var(--ncr-home-tw-invert,)var(--ncr-home-tw-saturate,)var(--ncr-home-tw-sepia,)var(--ncr-home-tw-drop-shadow,)}#ncr-public-home .blur-3xl{--ncr-home-tw-blur:blur(var(--blur-3xl));filter:var(--ncr-home-tw-blur,)var(--ncr-home-tw-brightness,)var(--ncr-home-tw-contrast,)var(--ncr-home-tw-grayscale,)var(--ncr-home-tw-hue-rotate,)var(--ncr-home-tw-invert,)var(--ncr-home-tw-saturate,)var(--ncr-home-tw-sepia,)var(--ncr-home-tw-drop-shadow,)}#ncr-public-home .backdrop-blur{--ncr-home-tw-backdrop-blur:blur(8px);-webkit-backdrop-filter:var(--ncr-home-tw-backdrop-blur,)var(--ncr-home-tw-backdrop-brightness,)var(--ncr-home-tw-backdrop-contrast,)var(--ncr-home-tw-backdrop-grayscale,)var(--ncr-home-tw-backdrop-hue-rotate,)var(--ncr-home-tw-backdrop-invert,)var(--ncr-home-tw-backdrop-opacity,)var(--ncr-home-tw-backdrop-saturate,)var(--ncr-home-tw-backdrop-sepia,);backdrop-filter:var(--ncr-home-tw-backdrop-blur,)var(--ncr-home-tw-backdrop-brightness,)var(--ncr-home-tw-backdrop-contrast,)var(--ncr-home-tw-backdrop-grayscale,)var(--ncr-home-tw-backdrop-hue-rotate,)var(--ncr-home-tw-backdrop-invert,)var(--ncr-home-tw-backdrop-opacity,)var(--ncr-home-tw-backdrop-saturate,)var(--ncr-home-tw-backdrop-sepia,)}#ncr-public-home .backdrop-blur-md{--ncr-home-tw-backdrop-blur:blur(var(--blur-md));-webkit-backdrop-filter:var(--ncr-home-tw-backdrop-blur,)var(--ncr-home-tw-backdrop-brightness,)var(--ncr-home-tw-backdrop-contrast,)var(--ncr-home-tw-backdrop-grayscale,)var(--ncr-home-tw-backdrop-hue-rotate,)var(--ncr-home-tw-backdrop-invert,)var(--ncr-home-tw-backdrop-opacity,)var(--ncr-home-tw-backdrop-saturate,)var(--ncr-home-tw-backdrop-sepia,);backdrop-filter:var(--ncr-home-tw-backdrop-blur,)var(--ncr-home-tw-backdrop-brightness,)var(--ncr-home-tw-backdrop-contrast,)var(--ncr-home-tw-backdrop-grayscale,)var(--ncr-home-tw-backdrop-hue-rotate,)var(--ncr-home-tw-backdrop-invert,)var(--ncr-home-tw-backdrop-opacity,)var(--ncr-home-tw-backdrop-saturate,)var(--ncr-home-tw-backdrop-sepia,)}#ncr-public-home .transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--ncr-home-tw-gradient-from,--ncr-home-tw-gradient-via,--ncr-home-tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--ncr-home-tw-ease,var(--default-transition-timing-function));transition-duration:var(--ncr-home-tw-duration,var(--default-transition-duration))}#ncr-public-home .transition-all{transition-property:all;transition-timing-function:var(--ncr-home-tw-ease,var(--default-transition-timing-function));transition-duration:var(--ncr-home-tw-duration,var(--default-transition-duration))}#ncr-public-home .transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--ncr-home-tw-gradient-from,--ncr-home-tw-gradient-via,--ncr-home-tw-gradient-to;transition-timing-function:var(--ncr-home-tw-ease,var(--default-transition-timing-function));transition-duration:var(--ncr-home-tw-duration,var(--default-transition-duration))}#ncr-public-home .transition-opacity{transition-property:opacity;transition-timing-function:var(--ncr-home-tw-ease,var(--default-transition-timing-function));transition-duration:var(--ncr-home-tw-duration,var(--default-transition-duration))}#ncr-public-home .transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--ncr-home-tw-ease,var(--default-transition-timing-function));transition-duration:var(--ncr-home-tw-duration,var(--default-transition-duration))}#ncr-public-home .duration-300{--ncr-home-tw-duration:.3s;transition-duration:.3s}#ncr-public-home .duration-500{--ncr-home-tw-duration:.5s;transition-duration:.5s}#ncr-public-home .duration-\\[1400ms\\]{--ncr-home-tw-duration:1.4s;transition-duration:1.4s}#ncr-public-home .ease-out{--ncr-home-tw-ease:var(--ease-out);transition-timing-function:var(--ease-out)}#ncr-public-home .will-change-transform{will-change:transform}#ncr-public-home .group-open\\:rotate-45:is(:where(.group):is([open],:popover-open,:open) *){rotate:45deg}#ncr-public-home .group-open\\:bg-brand:is(:where(.group):is([open],:popover-open,:open) *){background-color:var(--color-brand)}#ncr-public-home .group-open\\:text-white:is(:where(.group):is([open],:popover-open,:open) *){color:var(--color-white)}@media(hover:hover){#ncr-public-home .group-hover\\:-translate-y-1:is(:where(.group):hover *){--ncr-home-tw-translate-y:calc(var(--spacing)*-1);translate:var(--ncr-home-tw-translate-x)var(--ncr-home-tw-translate-y)}#ncr-public-home .group-hover\\:rotate-12:is(:where(.group):hover *){rotate:12deg}#ncr-public-home .group-hover\\:border-transparent:is(:where(.group):hover *){border-color:#0000}#ncr-public-home .group-hover\\:bg-\\(--c\\):is(:where(.group):hover *){background-color:var(--c)}#ncr-public-home .group-hover\\:bg-brand:is(:where(.group):hover *){background-color:var(--color-brand)}#ncr-public-home .group-hover\\:text-white:is(:where(.group):hover *){color:var(--color-white)}#ncr-public-home .group-hover\\:opacity-30:is(:where(.group):hover *){opacity:.3}#ncr-public-home .group-hover\\:opacity-100:is(:where(.group):hover *){opacity:1}}#ncr-public-home .group-data-\\[on\\=true\\]\\:h-3:is(:where(.group)[data-on=true] *){height:calc(var(--spacing)*3)}#ncr-public-home .group-data-\\[on\\=true\\]\\:w-1\\.5:is(:where(.group)[data-on=true] *){width:calc(var(--spacing)*1.5)}#ncr-public-home .group-data-\\[on\\=true\\]\\:bg-brand:is(:where(.group)[data-on=true] *){background-color:var(--color-brand)}#ncr-public-home .marker\\:hidden ::marker{display:none}#ncr-public-home .marker\\:hidden::marker{display:none}#ncr-public-home .marker\\:hidden ::-webkit-details-marker{display:none}#ncr-public-home .marker\\:hidden::-webkit-details-marker{display:none}@media(hover:hover){#ncr-public-home .hover\\:-translate-y-1:hover{--ncr-home-tw-translate-y:calc(var(--spacing)*-1);translate:var(--ncr-home-tw-translate-x)var(--ncr-home-tw-translate-y)}#ncr-public-home .hover\\:border-white\\/25:hover{border-color:#ffffff40}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .hover\\:border-white\\/25:hover{border-color:color-mix(in oklab,var(--color-white)25%,transparent)}}#ncr-public-home .hover\\:bg-black\\/5:hover{background-color:#0000000d}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .hover\\:bg-black\\/5:hover{background-color:color-mix(in oklab,var(--color-black)5%,transparent)}}#ncr-public-home .hover\\:bg-slate-100:hover{background-color:var(--color-slate-100)}#ncr-public-home .hover\\:bg-white\\/10:hover{background-color:#ffffff1a}@supports (color:color-mix(in lab,red,red)){#ncr-public-home .hover\\:bg-white\\/10:hover{background-color:color-mix(in oklab,var(--color-white)10%,transparent)}}#ncr-public-home .hover\\:text-ink:hover{color:var(--color-ink)}#ncr-public-home .hover\\:text-white:hover{color:var(--color-white)}#ncr-public-home .hover\\:shadow-\\[0_2px_4px_rgba\\(16\\,24\\,40\\,0\\.05\\)\\,0_40px_70px_-28px_rgba\\(16\\,24\\,40\\,0\\.3\\)\\]:hover{--ncr-home-tw-shadow:0 2px 4px var(--ncr-home-tw-shadow-color,#1018280d),0 40px 70px -28px var(--ncr-home-tw-shadow-color,#1018284d);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}#ncr-public-home .hover\\:shadow-\\[0_30px_60px_-30px_rgba\\(16\\,24\\,40\\,0\\.25\\)\\]:hover{--ncr-home-tw-shadow:0 30px 60px -30px var(--ncr-home-tw-shadow-color,#10182840);box-shadow:var(--ncr-home-tw-inset-shadow),var(--ncr-home-tw-inset-ring-shadow),var(--ncr-home-tw-ring-offset-shadow),var(--ncr-home-tw-ring-shadow),var(--ncr-home-tw-shadow)}}@media not all and (min-width:819px){#ncr-public-home .max-\\[819px\\]\\:mx-auto{margin-inline:auto}#ncr-public-home .max-\\[819px\\]\\:w-full{width:100%}#ncr-public-home .max-\\[819px\\]\\:max-w-\\[480px\\]{max-width:480px}}@media not all and (min-width:48rem){#ncr-public-home .max-md\\:col-span-1{grid-column:span 1/span 1}}@media(min-width:820px){#ncr-public-home .min-\\[820px\\]\\:aspect-\\[1\\.6\\]{aspect-ratio:1.6}}@media(min-width:40rem){#ncr-public-home .sm\\:h-48{height:calc(var(--spacing)*48)}#ncr-public-home .sm\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}#ncr-public-home .sm\\:p-3{padding:calc(var(--spacing)*3)}#ncr-public-home .sm\\:p-3\\.5{padding:calc(var(--spacing)*3.5)}#ncr-public-home .sm\\:p-6{padding:calc(var(--spacing)*6)}}@media(min-width:48rem){#ncr-public-home .md\\:col-span-2{grid-column:span 2/span 2}#ncr-public-home .md\\:col-span-3{grid-column:span 3/span 3}#ncr-public-home .md\\:grid-cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}#ncr-public-home .md\\:grid-cols-\\[1\\.3fr_1fr\\]{grid-template-columns:1.3fr 1fr}#ncr-public-home .md\\:flex-row{flex-direction:row}#ncr-public-home .md\\:items-start{align-items:flex-start}#ncr-public-home .md\\:p-8{padding:calc(var(--spacing)*8)}}@media(min-width:64rem){#ncr-public-home .lg\\:inset-x-auto{inset-inline:auto}#ncr-public-home .lg\\:top-1\\/2{top:50%}#ncr-public-home .lg\\:right-\\[5vw\\]{right:5vw}#ncr-public-home .lg\\:bottom-auto{bottom:auto}#ncr-public-home .lg\\:left-\\[5vw\\]{left:5vw}#ncr-public-home .lg\\:mt-4{margin-top:calc(var(--spacing)*4)}#ncr-public-home .lg\\:mt-20{margin-top:calc(var(--spacing)*20)}#ncr-public-home .lg\\:block{display:block}#ncr-public-home .lg\\:flex{display:flex}#ncr-public-home .lg\\:hidden{display:none}#ncr-public-home .lg\\:min-h-\\[108svh\\]{min-height:108svh}#ncr-public-home .lg\\:w-\\[min\\(28vw\\,420px\\)\\]{width:min(28vw,420px)}#ncr-public-home .lg\\:-translate-y-1\\/2{--ncr-home-tw-translate-y: -50% ;translate:var(--ncr-home-tw-translate-x)var(--ncr-home-tw-translate-y)}#ncr-public-home .lg\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}#ncr-public-home .lg\\:gap-5{gap:calc(var(--spacing)*5)}#ncr-public-home .lg\\:gap-6{gap:calc(var(--spacing)*6)}#ncr-public-home .lg\\:gap-16{gap:calc(var(--spacing)*16)}#ncr-public-home .lg\\:p-0{padding:calc(var(--spacing)*0)}#ncr-public-home .lg\\:p-7{padding:calc(var(--spacing)*7)}#ncr-public-home .lg\\:p-8{padding:calc(var(--spacing)*8)}#ncr-public-home .lg\\:py-24{padding-block:calc(var(--spacing)*24)}#ncr-public-home .lg\\:py-32{padding-block:calc(var(--spacing)*32)}#ncr-public-home .lg\\:py-36{padding-block:calc(var(--spacing)*36)}#ncr-public-home .lg\\:pt-28{padding-top:calc(var(--spacing)*28)}#ncr-public-home .lg\\:pt-36{padding-top:calc(var(--spacing)*36)}#ncr-public-home .lg\\:text-lg{font-size:var(--text-lg);line-height:var(--ncr-home-tw-leading,var(--text-lg--line-height))}#ncr-public-home .lg\\:text-\\[1\\.05rem\\]{font-size:1.05rem}}@media(min-width:80rem){#ncr-public-home .xl\\:inline-flex{display:inline-flex}#ncr-public-home .xl\\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}}#ncr-public-home .\\[\\&\\:\\:-webkit-details-marker\\]\\:hidden::-webkit-details-marker{display:none}@media(min-width:64rem){#ncr-public-home .lg\\:\\[\\&\\>\\*\\:first-child\\]\\:order-2>:first-child{order:2}}@media(max-height:820px){@media(min-width:64rem){#ncr-public-home .\\[\\@media\\(max-height\\:820px\\)\\]\\:lg\\:\\!pt-24{padding-top:calc(var(--spacing)*24)!important}}}#ncr-public-home{background:#f4f6fa;scroll-padding-top:72px}#ncr-public-home{font-family:var(--font-sans);color:#0b0d12;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;background:#f4f6fa;margin:0;overflow-x:clip}#ncr-public-home ::selection{color:#fff;background:#0a6cff}#ncr-public-home :focus-visible{outline-offset:3px;border-radius:8px;outline:2px solid #0a6cff}#ncr-public-home .btn{letter-spacing:-.01em;white-space:nowrap;border-radius:999px;justify-content:center;align-items:center;gap:.5rem;height:3rem;padding:0 1.5rem;font-size:.95rem;font-weight:600;transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s,background-color .25s,color .25s;display:inline-flex}#ncr-public-home .btn:hover{transform:translateY(-1px)}#ncr-public-home .btn:active{transform:translateY(0)scale(.98)}#ncr-public-home .btn-primary{color:#fff;background:#0a6cff;box-shadow:inset 0 1px #ffffff40,0 10px 28px -8px #0a6cff8c}#ncr-public-home .btn-primary:hover{background:#0b74ff;box-shadow:inset 0 1px #ffffff4d,0 16px 36px -10px #0a6cffb3}#ncr-public-home .btn-ghost{color:#0b0d12;-webkit-backdrop-filter:blur(12px);background:#ffffffb3;box-shadow:inset 0 0 0 1px #0b0d121a}#ncr-public-home .btn-ghost:hover{background:#fff}#ncr-public-home .btn-light{color:#0b0d12;background:#fff;box-shadow:0 14px 40px -12px #ffffff59}#ncr-public-home .glass{-webkit-backdrop-filter:blur(22px)saturate(1.6);background:#ffffffb8;border:1px solid #ffffffb3;box-shadow:0 24px 60px -24px #10182840,inset 0 1px #fffc}#ncr-public-home .eyebrow{letter-spacing:.14em;text-transform:uppercase;color:#0a6cff;font-size:.78rem;font-weight:600}#ncr-public-home .sr-only-focusable:not(:focus){clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}#ncr-public-home .tilt{transform-style:preserve-3d;transform:perspective(1100px)rotateX(var(--rx,0deg))rotateY(var(--ry,0deg));transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .4s}#ncr-public-home .tilt.is-moving{transition:transform .12s linear,box-shadow .4s}@media(prefers-reduced-motion:reduce){#ncr-public-home *,#ncr-public-home :before,#ncr-public-home :after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}@media(max-width:1023px){#ncr-public-home .glass-m{-webkit-backdrop-filter:blur(22px)saturate(1.6);background:#ffffffc7;border:1px solid #fffc;box-shadow:0 24px 60px -24px #1018284d,inset 0 1px #ffffffe6}}@keyframes ncr-home-cue{0%{transform:translateY(-100%)}to{transform:translateY(300%)}}#ncr-public-home [hidden]{display:none!important}#ncr-public-home button,#ncr-public-home a,#ncr-public-home summary{-webkit-tap-highlight-color:transparent}#ncr-public-home button,#ncr-public-home select{cursor:pointer}@media(prefers-reduced-motion:reduce){#ncr-public-home .tilt,#ncr-public-home .tilt.is-moving{transform:none!important}}@media(max-width:380px){#ncr-public-home header .btn{padding-inline:.75rem!important}}#ncr-public-home .vertical-selector{flex-wrap:wrap;justify-content:center;gap:8px;display:flex}#ncr-public-home .vertical-choice{color:#4b586c;background:#ffffffdf;border:1px solid #dfe5ed;border-radius:999px;justify-content:center;align-items:center;gap:7px;min-height:42px;padding:9px 13px;font-size:12px;font-weight:600;transition:background .25s,border-color .25s,box-shadow .25s,transform .25s;display:inline-flex}#ncr-public-home .vertical-choice svg{color:var(--choice-accent);flex-shrink:0}#ncr-public-home .vertical-choice:hover{border-color:var(--choice-accent);transform:translateY(-1px)}#ncr-public-home .vertical-choice[aria-pressed=true]{background:var(--choice-soft);color:var(--choice-accent);border-color:var(--choice-accent);box-shadow:0 4px 20px -8px var(--choice-accent)}#ncr-public-home .hero-kicker{letter-spacing:.15em;color:#52627a;margin-bottom:16px;font-size:10px;font-weight:650}#ncr-public-home .hero-title{letter-spacing:-.04em;max-width:1000px;font-size:clamp(2rem,min(5.7vw,6.6vh),4.7rem);font-weight:650;line-height:1.04}#ncr-public-home .hero-description{color:#52627a;max-width:670px;margin-top:16px;font-size:clamp(.9rem,1.3vw,1.08rem);line-height:1.6}#ncr-public-home .hero-context{flex-direction:column;justify-content:center;gap:5px;max-width:800px;min-height:62px;margin-top:12px;display:flex}#ncr-public-home .hero-context strong{color:var(--vertical-accent);font-size:13px;transition:color .3s}#ncr-public-home .hero-context span{color:#52627a;font-size:11px;line-height:1.5}#ncr-public-home .hero-actions{flex-wrap:wrap;justify-content:center;gap:10px;margin-top:12px;display:flex}#ncr-public-home .hero-actions .btn-primary{background:var(--vertical-accent);box-shadow:0 12px 28px -12px var(--vertical-accent)}#ncr-public-home .story-selector{transition:opacity .3s}#ncr-public-home .story-selector .vertical-selector{-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);background:#f8fafce8;border:1px solid #ffffffb0;border-radius:28px;width:fit-content;max-width:100%;margin:auto;padding:6px}@media(max-width:639px){#ncr-public-home .hero-kicker{letter-spacing:.09em;font-size:8px}#ncr-public-home .vertical-selector{gap:6px}#ncr-public-home .vertical-choice{gap:5px;min-height:38px;padding:8px 10px;font-size:10px}#ncr-public-home .hero-context{min-height:70px}#ncr-public-home .hero-actions .btn{height:42px;padding:0 14px;font-size:12px}#ncr-public-home .story-selector .vertical-choice{min-height:34px;padding:6px 9px}}@media(max-height:740px)and (min-width:1024px){#ncr-public-home .hero-kicker{margin-bottom:8px}#ncr-public-home .hero-description{margin-top:10px}#ncr-public-home .hero-context{min-height:44px;margin-top:8px}#ncr-public-home .hero-actions{margin-top:8px}}#ncr-public-home .platform-hub{margin-top:56px;position:relative}#ncr-public-home .hub-brand{z-index:1;background:linear-gradient(140deg,#fff,#eef3fb);border:1px solid #dce3ed;border-radius:28px;flex-direction:column;justify-content:center;align-items:center;gap:14px;width:230px;margin:0 auto;padding:30px 20px;display:flex;position:relative;box-shadow:0 25px 65px -25px #485f8b50,inset 0 1px #fff}#ncr-public-home .hub-brand:after{content:"";background:#bac7d8;width:1px;height:38px;position:absolute;top:100%;left:50%}#ncr-public-home .hub-brand>span{letter-spacing:.13em;color:#52627a;font-size:10px;font-weight:650}#ncr-public-home .hub-branches{grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-top:76px;display:grid;position:relative}#ncr-public-home .hub-branches:before{content:"";background:linear-gradient(90deg,#2458c640,#9b1c1c40,#28745140,#94600e40,#65205240);height:1px;position:absolute;top:-38px;left:10%;right:10%}#ncr-public-home .hub-branch{background:linear-gradient(145deg,#fff,var(--branch-soft));text-align:center;min-height:158px;box-shadow:0 12px 30px -24px var(--branch-accent);border:1px solid #e1e7ef;border-radius:22px;flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:24px 10px;display:flex;position:relative}#ncr-public-home .hub-branch:before{content:"";background:var(--branch-accent);opacity:.3;width:1px;height:38px;position:absolute;bottom:100%;left:50%}#ncr-public-home .hub-branch svg,#ncr-public-home .hub-branch strong{color:var(--branch-accent)}#ncr-public-home .hub-branch strong{font-size:14px}#ncr-public-home .hub-branch span{color:#52627a;font-size:11px}#ncr-public-home .common-pillars{flex-wrap:wrap;justify-content:center;gap:9px;margin-top:34px;display:flex}#ncr-public-home .common-pillars li{color:#52627a;background:#ffffffc0;border:1px solid #dfe5ed;border-radius:999px;padding:12px 18px;font-size:12px;font-weight:550}@media(max-width:767px){#ncr-public-home .hub-branches{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:30px}#ncr-public-home .hub-branch:last-child{grid-column:1/-1}#ncr-public-home .hub-branch{min-height:125px;padding:20px 10px}#ncr-public-home .hub-brand:after{height:30px}#ncr-public-home .hub-branches:before,#ncr-public-home .hub-branch:before{display:none}#ncr-public-home .common-pillars li{padding:9px 12px;font-size:11px}}@keyframes ncr-home-preview-enter{0%{opacity:.3;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}#ncr-public-home .preview-enter{animation:.4s ease-out ncr-home-preview-enter}#ncr-public-home #offres .btn-primary{background:var(--vertical-accent);box-shadow:0 12px 28px -12px var(--vertical-accent)}#ncr-public-home [id]{scroll-margin-top:110px}#ncr-public-home .metier-grid{grid-template-columns:1fr}#ncr-public-home .metier-grid article{height:100%}@media(min-width:640px){#ncr-public-home .metier-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#ncr-public-home .metier-grid>div{grid-column:span 2}#ncr-public-home .metier-grid>div:last-child{grid-column:2/span 2}}@media(min-width:1024px){#ncr-public-home .metier-grid{grid-template-columns:repeat(6,minmax(0,1fr))}#ncr-public-home .metier-grid>div:nth-child(4){grid-column:2/span 2}#ncr-public-home .metier-grid>div:last-child{grid-column:4/span 2}}#ncr-public-home .product-carousel{color:#fff;background:#05070c;position:relative}#ncr-public-home .product-sticky{padding:120px 0 64px;overflow:clip}#ncr-public-home .product-heading{text-align:center;width:min(90%,850px);margin:0 auto 28px}#ncr-public-home .product-window{overflow:clip}#ncr-public-home .product-track{scroll-snap-type:x mandatory;scrollbar-width:thin;gap:24px;padding:12px 8vw 30px;display:flex;overflow-x:auto}#ncr-public-home .product-slide{scroll-snap-align:center;flex:0 0 82vw;margin:0}#ncr-public-home .product-device{background:linear-gradient(#3a404d,#14171d);border-radius:22px;padding:6px;box-shadow:0 20px 40px -20px #000}#ncr-public-home .product-device img,#ncr-public-home .product-placeholder{aspect-ratio:4/5;background:#172033;border-radius:16px;width:100%;display:block}#ncr-public-home .product-controls{text-align:center;width:min(92%,950px);margin:24px auto 0}#ncr-public-home .product-progress{background:#ffffff20;width:150px;height:2px;margin:16px auto;overflow:hidden}#ncr-public-home .product-progress span{background:var(--vertical-accent);transform-origin:0;height:100%;display:block}#ncr-public-home .product-caption{min-height:65px}@media(min-width:820px){#ncr-public-home .product-device img,#ncr-public-home .product-placeholder{aspect-ratio:1.6}#ncr-public-home .product-slide{flex-basis:72vw}#ncr-public-home .product-track{padding-inline:14vw}}#ncr-public-home .product-carousel.is-pinned{height:360vh}#ncr-public-home .is-pinned .product-sticky{flex-direction:column;height:100svh;padding:100px 0 20px;display:flex;position:sticky;top:0}#ncr-public-home .is-pinned .product-heading{margin-bottom:16px}#ncr-public-home .is-pinned .product-heading p:last-child{font-size:14px}#ncr-public-home .is-pinned .product-track{margin-left:calc(50vw - (min(68vw,56vh,880px)/2));padding:10px 0 24px;overflow:visible}#ncr-public-home .is-pinned .product-slide{transform-origin:50%;flex-basis:min(68vw,56vh,880px)}#ncr-public-home .is-pinned .product-controls{margin-top:auto}#ncr-public-home .is-pinned .product-caption{min-height:56px}#ncr-public-home .tilt{will-change:auto}#ncr-public-home .tilt.is-moving{will-change:transform}#ncr-public-home .is-pinned .product-heading h2{font-size:clamp(1.8rem,3vw,2.8rem)}@property --ncr-home-tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --ncr-home-tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --ncr-home-tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --ncr-home-tw-rotate-x{syntax:"*";inherits:false}@property --ncr-home-tw-rotate-y{syntax:"*";inherits:false}@property --ncr-home-tw-rotate-z{syntax:"*";inherits:false}@property --ncr-home-tw-skew-x{syntax:"*";inherits:false}@property --ncr-home-tw-skew-y{syntax:"*";inherits:false}@property --ncr-home-tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --ncr-home-tw-divide-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --ncr-home-tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --ncr-home-tw-gradient-position{syntax:"*";inherits:false}@property --ncr-home-tw-gradient-from{syntax:"<color>";inherits:false;initial-value:#0000}@property --ncr-home-tw-gradient-via{syntax:"<color>";inherits:false;initial-value:#0000}@property --ncr-home-tw-gradient-to{syntax:"<color>";inherits:false;initial-value:#0000}@property --ncr-home-tw-gradient-stops{syntax:"*";inherits:false}@property --ncr-home-tw-gradient-via-stops{syntax:"*";inherits:false}@property --ncr-home-tw-gradient-from-position{syntax:"<length-percentage>";inherits:false;initial-value:0%}@property --ncr-home-tw-gradient-via-position{syntax:"<length-percentage>";inherits:false;initial-value:50%}@property --ncr-home-tw-gradient-to-position{syntax:"<length-percentage>";inherits:false;initial-value:100%}@property --ncr-home-tw-leading{syntax:"*";inherits:false}@property --ncr-home-tw-font-weight{syntax:"*";inherits:false}@property --ncr-home-tw-tracking{syntax:"*";inherits:false}@property --ncr-home-tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --ncr-home-tw-shadow-color{syntax:"*";inherits:false}@property --ncr-home-tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --ncr-home-tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --ncr-home-tw-inset-shadow-color{syntax:"*";inherits:false}@property --ncr-home-tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --ncr-home-tw-ring-color{syntax:"*";inherits:false}@property --ncr-home-tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --ncr-home-tw-inset-ring-color{syntax:"*";inherits:false}@property --ncr-home-tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --ncr-home-tw-ring-inset{syntax:"*";inherits:false}@property --ncr-home-tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --ncr-home-tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --ncr-home-tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --ncr-home-tw-blur{syntax:"*";inherits:false}@property --ncr-home-tw-brightness{syntax:"*";inherits:false}@property --ncr-home-tw-contrast{syntax:"*";inherits:false}@property --ncr-home-tw-grayscale{syntax:"*";inherits:false}@property --ncr-home-tw-hue-rotate{syntax:"*";inherits:false}@property --ncr-home-tw-invert{syntax:"*";inherits:false}@property --ncr-home-tw-opacity{syntax:"*";inherits:false}@property --ncr-home-tw-saturate{syntax:"*";inherits:false}@property --ncr-home-tw-sepia{syntax:"*";inherits:false}@property --ncr-home-tw-drop-shadow{syntax:"*";inherits:false}@property --ncr-home-tw-drop-shadow-color{syntax:"*";inherits:false}@property --ncr-home-tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --ncr-home-tw-drop-shadow-size{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-blur{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-brightness{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-contrast{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-grayscale{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-invert{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-opacity{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-saturate{syntax:"*";inherits:false}@property --ncr-home-tw-backdrop-sepia{syntax:"*";inherits:false}@property --ncr-home-tw-duration{syntax:"*";inherits:false}@property --ncr-home-tw-ease{syntax:"*";inherits:false}@font-face { font-family:NCRHomeInter; src:url("/fonts/inter-variable.woff2") format("woff2"); font-weight:100 900; font-style:normal; font-display:swap; }html:has(#ncr-public-home), body:has(#ncr-public-home), #root:has(#ncr-public-home) { overflow-x:clip; overflow-y:visible; }#ncr-public-home { font-feature-settings:normal; display:block; font-family:NCRHomeInter,ui-sans-serif,system-ui,sans-serif; line-height:1.5; color:#0b0d12; background:#f4f6fa; overflow-x:clip; }';var ih=0;function bR({navigate:i}){return Ot(()=>(ih++,()=>{ih--,queueMicrotask(()=>{ih===0&&(an.globalTimeline.clear(),an.ticker.sleep())})}),[]),re("div",{onClick:t=>{if(t.defaultPrevented||t.button!==0||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey)return;let a=t.target.closest("a[href]");if(!a||a.target||a.hasAttribute("download")||a.getAttribute("href")?.startsWith("#"))return;let n=new URL(a.href,location.href);n.origin===location.origin&&(t.preventDefault(),i(n.pathname+n.search+n.hash))},children:[P("style",{"data-ncr-public-home":"true",children:fx}),P(nh,{})]})}export{bR as PublicHome};
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs:
lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs:
lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs:
lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs:
lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs:
lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs:
lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs:
lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs:
lucide-react/dist/esm/context.mjs:
lucide-react/dist/esm/Icon.mjs:
lucide-react/dist/esm/createLucideIcon.mjs:
lucide-react/dist/esm/icons/arrow-right.mjs:
lucide-react/dist/esm/icons/arrow-up-right.mjs:
lucide-react/dist/esm/icons/check.mjs:
lucide-react/dist/esm/icons/earth.mjs:
lucide-react/dist/esm/icons/globe.mjs:
lucide-react/dist/esm/icons/graduation-cap.mjs:
lucide-react/dist/esm/icons/layers.mjs:
lucide-react/dist/esm/icons/menu.mjs:
lucide-react/dist/esm/icons/plus.mjs:
lucide-react/dist/esm/icons/puzzle.mjs:
lucide-react/dist/esm/icons/scissors.mjs:
lucide-react/dist/esm/icons/shield-check.mjs:
lucide-react/dist/esm/icons/sparkles.mjs:
lucide-react/dist/esm/icons/users.mjs:
lucide-react/dist/esm/icons/utensils.mjs:
lucide-react/dist/esm/icons/x.mjs:
lucide-react/dist/esm/lucide-react.mjs:
  (**
   * @license lucide-react v1.49.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2026 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)

gsap/gsap-core.js:
  (*!
   * GSAP 3.15.0
   * https://gsap.com
   *
   * @license Copyright 2008-2026, GreenSock. All rights reserved.
   * Subject to the terms at https://gsap.com/standard-license
   * @author: Jack Doyle, jack@greensock.com
  *)

gsap/CSSPlugin.js:
  (*!
   * CSSPlugin 3.15.0
   * https://gsap.com
   *
   * Copyright 2008-2026, GreenSock. All rights reserved.
   * Subject to the terms at https://gsap.com/standard-license
   * @author: Jack Doyle, jack@greensock.com
  *)
*/

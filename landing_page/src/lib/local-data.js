// Datos locales para la landing page de SUTENS
// Reemplaza la integración con Sanity por datos estáticos

import imagenNoticia1 from '../assets/landing/5.jpg';
import imagenNoticia2 from '../assets/landing/3.jpg';
import imagenNoticia3 from '../assets/landing/1.jpg';
import imagenNoticia4 from '../assets/landing/2.jpg';

export const news = [
  {
    id: 1,
    title: "Nuevo convenio colectivo beneficia a todos los afiliados",
    description: "Se ha firmado un nuevo convenio colectivo que beneficia a todos los afiliados de SUTENS, fortaleciendo la organización sindical y los derechos laborales.",
    imageUrl: imagenNoticia1,
    publishedAt: "2024-03-15",
    category: "noticias"
  },
  {
    id: 2,
    title: "Resolución de la huelga de docentes",
    description: "La dirección de SUTENS ha firmado una resolución que garantiza condiciones laborales justas y la protección de los derechos de los docentes en Norte de Santander.",
    imageUrl: imagenNoticia2,
    publishedAt: "2024-03-14",
    category: "noticias"
  },
  {
    id: 3,
    title: "Conferencia de la Confederación Sindical",
    description: "Participación de representantes de SUTENS en la conferencia nacional de la Confederación Sindical, defendiendo los intereses de los trabajadores del sector educativo.",
    imageUrl: imagenNoticia3,
    publishedAt: "2024-03-13",
    category: "noticias"
  },
  {
    id: 4,
    title: "Formación continua para afiliados",
    description: "Programa de capacitación organizado por SUTENS para fortalecer las competencias profesionales de sus miembros y mejorar su desempeño laboral.",
    imageUrl: imagenNoticia4,
    publishedAt: "2024-03-12",
    category: "noticias"
  }
];

export const sections = [
  {
    id: "who-are-us",
    title: "Quiénes somos",
    description: "SUTENS es el Sindicato Unitario de Trabajadores de la Educación de Norte de Santander, defensor de los derechos laborales y promotor de la educación pública.",
    cards: [
      {
        icon: "shield",
        title: "Defensa de los derechos",
        description: "Protección de los derechos laborales y condiciones de trabajo justas.",
        color: "text-amber-700"
      },
      {
        icon: "people",
        title: "Afiliados",
        description: "Más de 10,000 docentes y trabajadores unidos bajo el mismo objetivo.",
        color: "text-primary"
      },
      {
        icon: "building",
        title: "Presencia territorial",
        description: "Presencia activa y delegaciones en todo Norte de Santander.",
        color: "text-primary"
      }
    ]
  },
  {
    id: "benefits",
    title: "Beneficios para afiliados",
    description: "Aproveche las ventajas que ofrece SUTENS a través de la afiliación.",
    cards: [
      {
        icon: "check",
        title: "Asesoría legal",
        description: "Asesoría gratuita en temas laborales y derechos sindicales.",
        color: "text-emerald-600"
      },
      {
        icon: "briefcase",
        title: "Capacitación",
        description: "Cursos y talleres para mejorar competencias profesionales.",
        color: "text-primary"
      },
      {
        icon: "briefcase",
        title: "Negociación colectiva",
        description: "Mejoras salariales y condiciones laborales garantizadas.",
        color: "text-amber-700"
      }
    ]
  },
  {
    id: "activities",
    title: "Actividades",
    description: "Participa en nuestras actividades y eventos.",
    cards: [
      {
        icon: "calendar",
        title: "Asambleas",
        description: "Reuniones periódicas para escuchar las necesidades de los afiliados.",
        color: "text-primary"
      },
      {
        icon: "speech-bubble",
        title: "Comunicaciones",
        description: "Seguimos las noticias y actualizaciones de SUTENS.",
        color: "text-primary"
      },
      {
        icon: "map-pin",
        title: "Sede",
        description: "Dirección de la sede central en Norte de Santander.",
        color: "text-primary"
      }
    ]
  },
  {
    id: "contact",
    title: "Contacto",
    description: "Unimos fuerzas para defender los derechos de los trabajadores.",
    cards: [
      {
        icon: "phone",
        title: "Correo electrónico",
        description: "afiliaciones@sutens.org",
        color: "text-primary"
      },
      {
        icon: "mail",
        title: "Redes sociales",
        description: "Síguenos en nuestras redes para mantenernos actualizados.",
        color: "text-primary"
      },
      {
        icon: "map-pin",
        title: "Sede",
        description: "Norte de Santander, Colombia",
        color: "text-primary"
      }
    ]
  }
];

export const navigation = [
  {
    label: "Quiénes somos",
    icon: "people",
    link: "/quienes-somos"
  },
  {
    label: "Beneficios",
    icon: "check",
    link: "/beneficios"
  },
  {
    label: "Actividades",
    icon: "calendar",
    link: "/actividades"
  },
  {
    label: "Comunicaciones",
    icon: "speech-bubble",
    link: "/comunicaciones"
  },
  {
    label: "Contacto",
    icon: "phone",
    link: "/contacto"
  }
];
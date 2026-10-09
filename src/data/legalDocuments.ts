export interface LegalSection {
  id: string;
  title: string;
  content: string[];
}

export interface LegalDocument {
  id: "privacy" | "terms";
  title: string;
  subtitle: string;
  lastUpdated: string;
  companyName: string;
  commercialName: string;
  legalRepresentative: string;
  nif: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  id: "privacy",
  title: "Política de Privacidad",
  subtitle: "Información detallada sobre el tratamiento y protección de sus datos personales conforme al RGPD y la LOPDGDD",
  lastUpdated: "9 de octubre de 2026",
  companyName: "RRO AGENCY AI",
  commercialName: "RRO Agency AI",
  legalRepresentative: "Marcos Damián Rodriguez Basualdo",
  nif: "53927966G",
  address: "Calle Alejandro Dumas 17 - Oficinas, 29004 Málaga, España",
  email: "hola@rroagencyai.com",
  phone: "(+34) 644 21 29 29",
  website: "https://appytool.com",
  sections: [
    {
      id: "priv-1",
      title: "1. Identificación del Responsable",
      content: [
        "En cumplimiento del Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD) y demás normativa aplicable, le informamos que los datos personales facilitados a través de este sitio web serán tratados por RRO AGENCY AI (operando como RRO Agency AI), con NIF 53927966G y domicilio en Calle Alejandro Dumas 17 - Oficinas, 29004 Málaga, España.",
        "Email de contacto: hola@rroagencyai.com",
        "Teléfono: (+34) 644 21 29 29",
      ],
    },
    {
      id: "priv-2",
      title: "2. Qué datos personales recopilamos",
      content: [
        "Recogemos y tratamos los siguientes datos:",
        "• Datos identificativos: nombre, apellidos, email, teléfono, empresa, cargo.",
        "• Datos de facturación y pago: solo los estrictamente necesarios para la gestión de pagos (a través de Stripe y otros proveedores seguros).",
        "• Datos de uso y navegación: IP, logs de acceso, actividad en la plataforma, preferencias, cookies y tecnologías similares.",
        "• Mensajes, tickets y comunicaciones mantenidas con nuestro equipo de soporte.",
        "• Datos de clientes gestionados por el usuario: cuando utilice nuestras funcionalidades de CRM/automatización para sus propios clientes.",
        "• Datos de aplicaciones conectadas: por ejemplo, cuentas de Google, Meta, etc., si autoriza integraciones.",
        "Aviso importante: No tratamos datos sensibles (categorías especiales de datos) ni dirigimos nuestros servicios a menores de 18 años.",
      ],
    },
    {
      id: "priv-3",
      title: "3. Finalidades y bases legales del tratamiento",
      content: [
        "Tratamos sus datos para las siguientes finalidades:",
        "• Prestar y gestionar los servicios contratados (automatización, CRM, chatbots, agentes IA, etc.).",
        "• Gestionar la relación comercial, facturación y cobro.",
        "• Prestar soporte técnico y atención al cliente.",
        "• Mejorar la seguridad y calidad del servicio ofrecido.",
        "• Enviar comunicaciones comerciales únicamente si ha otorgado su consentimiento expreso.",
        "• Cumplir con las obligaciones legales aplicables.",
        "Bases legales aplicables:",
        "• Ejecución de contrato y medidas precontractuales.",
        "• Consentimiento expreso del interesado.",
        "• Interés legítimo (para la mejora constante de servicios y seguridad de las redes).",
        "• Cumplimiento de obligaciones legales aplicables a la entidad.",
      ],
    },
    {
      id: "priv-4",
      title: "4. ¿Con quién compartimos sus datos?",
      content: [
        "Sus datos podrán ser comunicados a proveedores tecnológicos que actúan como encargados de tratamiento, incluyendo:",
        "• Stripe Payments Europe Ltd. (Pasarela de pagos online seguros).",
        "• Hostinger International Ltd. (Alojamiento web y servidores VPS).",
        "• OpenAI LLC (Procesamiento de modelos de inteligencia artificial).",
        "• Google LLC (Infraestructura, Google Cloud, Drive, Calendar, Sheets, Gmail, etc.).",
        "• Amazon Web Services y Google Cloud (Infraestructura de almacenamiento en la nube).",
        "• GoHighLevel Inc. (CRM y marketing SaaS).",
        "• Make.com (Celonis, Inc.) (Plataforma de automatización y conectores).",
        "• Otros proveedores tecnológicos necesarios para la prestación del servicio (automatización, mensajería, integración, etc.).",
        "Garantías legales: Todos estos proveedores han suscrito el correspondiente Acuerdo de Encargado de Tratamiento (DPA). En caso de transferencia internacional fuera del Espacio Económico Europeo, garantizan el cumplimiento del RGPD mediante Cláusulas Contractuales Tipo (SCC) u otros mecanismos legales reconocidos.",
        "Algunos proveedores pueden emplear subencargados (por ejemplo, para infraestructura, hosting o soporte), manteniendo los mismos estándares de seguridad y protección de datos exigidos por la normativa europea.",
        "Asimismo, los datos podrán ser comunicados a autoridades administrativas y judiciales cuando sea legalmente preceptivo.",
      ],
    },
    {
      id: "priv-5",
      title: "5. Transferencias internacionales de datos",
      content: [
        "Algunos proveedores (por ejemplo, Stripe, OpenAI, AWS, Google, Make, GoHighLevel) pueden estar ubicados o procesar datos fuera del Espacio Económico Europeo (EEE), especialmente en Estados Unidos.",
        "En estos casos, las transferencias se realizan cumpliendo los artículos 44 y siguientes del RGPD, aplicando Cláusulas Contractuales Tipo (SCC) aprobadas por la Comisión Europea y medidas adicionales para garantizar un nivel de protección equivalente al de la Unión Europea.",
      ],
    },
    {
      id: "priv-6",
      title: "6. Plazo de conservación de los datos",
      content: [
        "Los datos personales se conservarán conforme a los siguientes criterios:",
        "• Durante la vigencia de la relación contractual y mientras sean necesarios para las finalidades indicadas.",
        "• Posteriormente, bloqueados durante los plazos legales exigidos por la normativa mercantil, fiscal y civil para atender posibles responsabilidades.",
        "• Datos para comunicaciones comerciales: hasta que revoque su consentimiento o ejerza su derecho de oposición.",
      ],
    },
    {
      id: "priv-7",
      title: "7. Derechos de los usuarios",
      content: [
        "Puede ejercer los siguientes derechos en cualquier momento y de forma gratuita:",
        "• Acceso: Conocer qué datos personales tratamos sobre usted.",
        "• Rectificación: Modificar datos inexactos o incompletos.",
        "• Supresión: Solicitar el borrado de sus datos ('derecho al olvido') cuando no sean necesarios.",
        "• Oposición: Oponerse a determinados tratamientos de sus datos.",
        "• Limitación: Solicitar la limitación del tratamiento en los supuestos previstos por el RGPD.",
        "• Portabilidad: Recibir sus datos en formato estructurado, de uso común y lectura mecánica.",
        "• Retirar el consentimiento: Revocar los consentimientos otorgados en cualquier momento.",
        "Procedimiento para ejercer sus derechos:",
        "Envíe un correo electrónico a hola@rroagencyai.com, indicando el derecho que desea ejercer y adjuntando una copia de su documento de identidad para verificar su titularidad.",
        "Si considera que sus derechos no han sido debidamente atendidos, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) a través de su sede electrónica en www.aepd.es.",
      ],
    },
    {
      id: "priv-8",
      title: "8. Seguridad y confidencialidad de los datos",
      content: [
        "Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos frente a accesos no autorizados, alteración, pérdida o destrucción accidental, teniendo en cuenta el estado de la técnica, la naturaleza de los datos y los riesgos asociados.",
        "Todas las comunicaciones en tránsito entre su dispositivo y nuestros servidores se cifran mediante protocolos seguros HTTPS / SSL de última generación.",
      ],
    },
    {
      id: "priv-9",
      title: "9. Uso de cookies y tecnologías similares",
      content: [
        "Utilizamos cookies propias y de terceros (por ejemplo, Google Analytics, Meta Pixel, herramientas de analítica y personalización) para analizar el uso de la web y mejorar la experiencia del usuario.",
        "Puede configurar o rechazar las cookies no esenciales en cualquier momento mediante la configuración de su navegador web.",
      ],
    },
    {
      id: "priv-10",
      title: "10. Información sobre menores de edad",
      content: [
        "Nuestros servicios están dirigidos de manera exclusiva a personas mayores de 18 años. No recopilamos conscientemente datos de menores de edad. En caso de detectar que se han recabado datos de un menor de edad sin autorización parental, procederemos a su eliminación inmediata.",
      ],
    },
    {
      id: "priv-11",
      title: "11. Servicios basados en inteligencia artificial",
      content: [
        "Algunas funcionalidades de la plataforma utilizan sistemas avanzados de inteligencia artificial proporcionados por proveedores de primer nivel (como OpenAI LLC, Google y otros).",
        "• Los datos introducidos se procesan exclusivamente para la prestación del servicio educativo o de automatización contratado.",
        "• Se aplican las garantías descritas en esta política y en los acuerdos de encargado de tratamiento correspondientes.",
        "• El usuario es responsable de no introducir datos sensibles, confidenciales de terceros o carentes de base jurídica adecuada en los modelos de IA.",
      ],
    },
    {
      id: "priv-12",
      title: "12. Cambios en la Política de Privacidad",
      content: [
        "Podemos modificar esta política para adaptarla a cambios legislativos, criterios de la autoridad de control o a nuevas funcionalidades y servicios. Notificaremos los cambios relevantes a través de la web o por correo electrónico. Le recomendamos revisar periódicamente esta política.",
      ],
    },
    {
      id: "priv-13",
      title: "13. Contacto",
      content: [
        "Para cualquier duda, consulta o ejercicio de derechos en materia de protección de datos personales, puede contactar con nosotros:",
        "Email de contacto: hola@rroagencyai.com",
        "Teléfono: (+34) 644 21 29 29",
        "Dirección: Calle Alejandro Dumas 17 - Oficinas, 29004 Málaga, España",
      ],
    },
  ],
};

export const TERMS_AND_CONDITIONS: LegalDocument = {
  id: "terms",
  title: "Términos y Condiciones",
  subtitle: "Condiciones legales de contratación, uso de los servicios y acuerdo vinculante con RRO Agency AI",
  lastUpdated: "9 de octubre de 2026",
  companyName: "RRO AGENCY AI",
  commercialName: "RRO Agency AI",
  legalRepresentative: "Marcos Damián Rodriguez Basualdo",
  nif: "53927966G",
  address: "Calle Alejandro Dumas 17 - Oficinas, 29004 Málaga, España",
  email: "hola@rroagencyai.com",
  phone: "(+34) 644 21 29 29",
  website: "https://appytool.com",
  sections: [
    {
      id: "terms-intro",
      title: "Identificación Legal y Aceptación",
      content: [
        "Somos RRO AGENCY AI —operando como RRO Agency AI (la «Empresa», «nosotros», «nos», «nuestro»)— y gestionamos el sitio web https://appytool.com, así como cualesquiera otros productos o servicios que hagan referencia o enlacen a estos términos legales (los «Condiciones legales», y, colectivamente, los «Servicios»).",
        "Ofrecemos servicios de consultoría, implementación y gestión de sistemas CRM y automatización comercial, incluyendo el acceso a una plataforma de software para pequeñas empresas y emprendedores.",
        "Responsable legal: Marcos Damián Rodriguez Basualdo, NIF 53927966G.",
        "Dirección: Calle Alejandro Dumas 17 - Oficinas, 29004 Málaga, España.",
        "Contacto: Teléfono (+34) 644 21 29 29 · E-mail: hola@rroagencyai.com.",
        "Estos Condiciones legales constituyen un acuerdo vinculante entre tú (persona física o, en su caso, la entidad a la que representas) y RRO Agency AI respecto al acceso y uso de los Servicios.",
        "SI NO ACEPTAS ÍNTEGRAMENTE ESTOS TÉRMINOS, NO UTILICES LOS SERVICIOS.",
        "Cualquier modificación te será comunicada con 15 días de antelación al e-mail de la cuenta. Seguir usando los Servicios tras la fecha de entrada en vigor implica aceptación de los cambios.",
        "Los Servicios están destinados a mayores de 18 años.",
      ],
    },
    {
      id: "terms-1",
      title: "1. Nuestros Servicios",
      content: [
        "La información proporcionada a través de los Servicios no está destinada a ser distribuida ni utilizada por ninguna persona o entidad en ninguna jurisdicción o país donde dicha distribución o uso sea contrario a la ley o regulación, o que nos someta a cualquier requisito de registro en esa jurisdicción o país. Por tanto, quienes decidan acceder a los Servicios desde otras ubicaciones lo hacen por iniciativa propia y son los únicos responsables del cumplimiento de la legislación local que les sea aplicable.",
        "Nuestros Servicios están dirigidos principalmente a pequeñas empresas y profesionales independientes establecidos en España o la Unión Europea. No obstante, si accedes desde fuera de la Unión Europea, aceptas que tus datos pueden ser tratados conforme a la normativa europea y española de protección de datos.",
        "Limitaciones sectoriales: Nuestros Servicios NO están diseñados para cumplir con regulaciones específicas de sectores altamente regulados (por ejemplo, HIPAA, FISMA u otras normativas equivalentes fuera de la Unión Europea). Si tus actividades están sujetas a regulaciones sectoriales específicas, no puedes utilizar nuestros Servicios para esos fines.",
        "Queda prohibido utilizar los Servicios de una forma que contravenga cualquier normativa nacional o internacional aplicable, especialmente la relativa a protección de datos, seguridad de la información y derechos de consumidores y usuarios.",
      ],
    },
    {
      id: "terms-2",
      title: "2. Derechos de Propiedad Intelectual",
      content: [
        "Nuestra propiedad intelectual:",
        "Somos titulares o licenciatarios de todos los derechos de propiedad intelectual sobre los Servicios, incluyendo el código fuente, bases de datos, funcionalidades, software, diseños, textos, imágenes, fotografías, audios, vídeos y gráficos (el 'Contenido'), así como sobre las marcas comerciales, nombres comerciales, logotipos y demás signos distintivos (las 'Marcas').",
        "Tanto el Contenido como las Marcas están protegidos por la legislación española, europea e internacional en materia de propiedad intelectual e industrial. Queda prohibida la reproducción, distribución, comunicación pública, transformación o cualquier otro uso no autorizado de dichos elementos sin el consentimiento previo y expreso de RRO Agency AI, salvo en los casos legalmente permitidos.",
        "Tu uso de los Servicios:",
        "Se concede un derecho limitado, no exclusivo, intransferible y revocable para acceder y utilizar los Servicios y descargar o imprimir partes del Contenido a las que hayas accedido legítimamente, únicamente para tus fines comerciales internos.",
        "En ningún caso se podrá copiar, reproducir, agregar, republicar, cargar, publicar, mostrar públicamente, traducir, transmitir, distribuir, vender, licenciar o explotar de cualquier forma el Contenido o las Marcas para fines comerciales sin nuestra autorización previa y por escrito.",
        "Si deseas utilizar nuestros Servicios, Contenidos o Marcas de manera diferente a la aquí prevista, deberás solicitar autorización expresa en hola@rroagencyai.com.",
        "Envíos y Contribuciones:",
        "Al enviarnos preguntas, comentarios, sugerencias, ideas, propuestas u otra información relacionada con los Servicios ('Envíos'), nos cedes todos los derechos de explotación sobre dichos Envíos y autorizas su uso sin restricción ni reconocimiento o compensación alguna.",
        "Si a través de los Servicios participas en chats, blogs, foros u otros espacios interactivos y publicas textos, imágenes, vídeos, audios u otros materiales ('Contribuciones'), comprendes que pueden ser visibles por otros usuarios e incluso por terceros, y otorgas a RRO Agency AI una licencia irrevocable, no exclusiva, mundial, gratuita y transferible para usar, reproducir, distribuir, mostrar y explotar dichas Contribuciones en los términos previstos por la ley.",
      ],
    },
    {
      id: "terms-3",
      title: "3. Declaraciones del Usuario",
      content: [
        "Al utilizar los Servicios, declaras y garantizas que:",
        "• Toda la información de registro que proporciones es veraz, exacta, actual y completa, y te comprometes a mantenerla actualizada en todo momento.",
        "• Tienes la capacidad legal para aceptar estos Términos y, en su caso, ostentas la representación suficiente de la entidad en cuyo nombre actúas.",
        "• Eres mayor de edad según la legislación española (mínimo 18 años) y no utilizas los Servicios en nombre de menores o personas no autorizadas.",
        "• No accederás a los Servicios mediante métodos automatizados, como bots, scripts o sistemas similares.",
        "• Utilizarás los Servicios exclusivamente para fines lícitos y autorizados, y en ningún caso infringirás la legislación vigente ni estos Términos.",
        "• No utilizarás los Servicios para ningún fin ilícito, fraudulento o no autorizado.",
        "• El uso que realices de los Servicios no violará ninguna ley, reglamento o derechos de terceros aplicables en España, la Unión Europea o cualquier jurisdicción desde la que accedas.",
        "Si suministras información falsa, inexacta, incompleta o desactualizada, o incumples alguna de estas declaraciones, RRO Agency AI se reserva el derecho a suspender, limitar o cancelar tu acceso a los Servicios.",
      ],
    },
    {
      id: "terms-4",
      title: "4. Registro de Usuario",
      content: [
        "Para acceder a determinados Servicios puede ser necesario registrarse y crear una cuenta de usuario. Te comprometes a mantener la confidencialidad de tus credenciales de acceso (nombre de usuario y contraseña), siendo responsable de todas las actividades realizadas bajo tu cuenta.",
        "RRO Agency AI se reserva el derecho de eliminar, reclamar o modificar cualquier nombre de usuario si, a su exclusivo criterio, considera que es inapropiado, ofensivo, confuso, contrario a la ley o a derechos de terceros.",
        "Eres responsable de notificar inmediatamente a RRO Agency AI cualquier uso no autorizado de tu cuenta o cualquier violación de seguridad que detectes. RRO Agency AI no será responsable de ninguna pérdida o daño derivado del incumplimiento de esta obligación.",
      ],
    },
    {
      id: "terms-5",
      title: "5. Compras y Pago",
      content: [
        "Las compras de productos y servicios a través de los Servicios se realizan mediante el sistema de pagos seguro Stripe, que admite tarjetas Visa, MasterCard, American Express, Discover y PayPal.",
        "Te comprometes a proporcionar información actual, completa y veraz durante el proceso de compra, así como a mantener actualizados tus datos de contacto y facturación. Nos reservamos el derecho de corregir cualquier error en los precios, incluso si el pago ya ha sido solicitado o recibido.",
        "Todos los precios se muestran en euros (€) e incluyen, cuando proceda, el IVA vigente conforme a la legislación española. Los importes y condiciones pueden ser modificados en cualquier momento, pero cualquier cambio será comunicado previamente y nunca afectará a pedidos ya formalizados.",
        "Nos reservamos el derecho de limitar o cancelar pedidos a nuestra entera discreción, especialmente en caso de detectar posibles usos fraudulentos, revendedores o distribuidores no autorizados.",
      ],
    },
    {
      id: "terms-6",
      title: "6. Suscripciones",
      content: [
        "Facturación y renovación: Si contratas una suscripción a nuestros Servicios, esta se renovará automáticamente en el período seleccionado (mensual o anual), a menos que la canceles antes de la fecha de renovación. Al aceptar estos términos, autorizas expresamente a que se realicen cargos periódicos y automáticos en tu método de pago seleccionado a través de Stripe, sin necesidad de aprobación adicional para cada renovación.",
        "Cancelación: Puedes cancelar tu suscripción en cualquier momento desde tu área de usuario o contactando con nosotros en hola@rroagencyai.com. La cancelación será efectiva al finalizar el periodo de suscripción ya abonado. No se realizarán devoluciones parciales por periodos no consumados, salvo lo establecido en la normativa aplicable en materia de consumidores y usuarios.",
        "Cambios en las tarifas: Nos reservamos el derecho a modificar las tarifas de suscripción. En caso de cambios, te avisaremos con al menos 15 días de antelación antes de la próxima renovación. Si no estás de acuerdo con la nueva tarifa, podrás cancelar la suscripción antes de que entre en vigor el nuevo precio.",
      ],
    },
    {
      id: "terms-7",
      title: "7. Actividades Prohibidas",
      content: [
        "No podrás acceder ni utilizar los Servicios para ningún fin distinto de aquel para el que te los ofrecemos y conforme a la legalidad vigente. Está expresamente prohibido, entre otros:",
        "• Recopilar datos o contenido de los Servicios para crear o compilar, directa o indirectamente, una colección, base de datos o directorio sin autorización expresa.",
        "• Engañar, defraudar o confundir a nosotros o a otros usuarios, especialmente con el fin de obtener datos confidenciales (como contraseñas).",
        "• Eludir, deshabilitar o interferir con las funciones de seguridad de los Servicios.",
        "• Difamar, perjudicar o menoscabar a RRO Agency AI, su equipo, sus Servicios o a otros usuarios.",
        "• Utilizar la información obtenida a través de los Servicios para acosar, abusar o dañar a terceros.",
        "• Hacer un uso indebido de los canales de soporte o enviar denuncias falsas.",
        "• Utilizar los Servicios de manera contraria a la normativa vigente, incluyendo la LOPDGDD y el RGPD.",
        "• Subir o transmitir virus, malware, spam u otro material dañino que afecte a los Servicios o a otros usuarios.",
        "• Utilizar scripts, bots o herramientas automatizadas para acceder, interactuar o extraer datos de los Servicios sin autorización.",
        "• Suplantar la identidad de otra persona o usuario.",
        "• Realizar ingeniería inversa, descompilar o intentar acceder al código fuente de los Servicios, salvo que lo permita la ley.",
      ],
    },
    {
      id: "terms-8",
      title: "8. Contribuciones Generadas por los Usuarios",
      content: [
        "Los Servicios pueden ofrecerte espacios para participar en chats, foros, blogs, reseñas u otras funcionalidades donde puedes crear o compartir contenidos ('Contribuciones').",
        "Las Contribuciones podrán ser visibles para otros usuarios. Declaras y garantizas que eres el autor o posees todos los derechos necesarios sobre dichas Contribuciones, que no infringen derechos de terceros y no contienen datos personales sensibles ni información ilícita.",
        "RRO Agency AI no asume responsabilidad sobre el contenido de las Contribuciones generadas por los usuarios, reservándose el derecho de revisar, eliminar o bloquear cualquier contenido contrario a estos términos.",
      ],
    },
    {
      id: "terms-9",
      title: "9. Licencia sobre Contribuciones",
      content: [
        "Al publicar cualquier Contribución a través de los Servicios, concedes a RRO Agency AI una licencia gratuita, no exclusiva, transferible, sublicenciable, irrevocable y de ámbito mundial para alojar, usar, copiar, reproducir, modificar, adaptar, publicar y mostrar públicamente dichas Contribuciones, con la finalidad de prestar, mantener, mejorar y promocionar los Servicios.",
      ],
    },
    {
      id: "terms-10",
      title: "10. Directrices para las Reseñas",
      content: [
        "Al publicar una reseña, te comprometes a que refleje una experiencia real y directa, sin lenguaje ofensivo, spam ni conflictos de intereses.",
        "RRO Agency AI podrá aceptar, rechazar, modificar o eliminar cualquier reseña a su entera discreción si considera que incumple estas directrices.",
      ],
    },
    {
      id: "terms-11",
      title: "11. Licencia de Aplicación Móvil",
      content: [
        "Si accedes a los Servicios a través de una aplicación móvil proporcionada por RRO Agency AI, se te concede un derecho limitado, no exclusivo, intransferible y revocable para instalar y usar la aplicación exclusivamente en tus dispositivos personales.",
      ],
    },
    {
      id: "terms-12",
      title: "12. Sitios Web y Contenido de Terceros",
      content: [
        "Los Servicios pueden contener enlaces o integraciones con sitios web, contenidos, aplicaciones o servicios de terceros. RRO Agency AI no supervisa ni se responsabiliza de la legalidad, exactitud o políticas de privacidad de los Sitios de terceros.",
      ],
    },
    {
      id: "terms-13",
      title: "13. Gestión de los Servicios",
      content: [
        "RRO Agency AI se reserva el derecho de supervisar el uso de los Servicios, adoptar medidas legales contra infractores, restringir accesos y eliminar contenidos que resulten ilícitos o sobrecarguen los sistemas para garantizar la seguridad de la plataforma.",
      ],
    },
    {
      id: "terms-14",
      title: "14. Política de Privacidad",
      content: [
        "En RRO Agency AI nos tomamos muy en serio la privacidad y la protección de los datos personales. El tratamiento de tus datos se realiza conforme al RGPD y la LOPDGDD. Al utilizar los Servicios, aceptas el tratamiento conforme a nuestra Política de Privacidad.",
      ],
    },
    {
      id: "terms-15",
      title: "15. Infracciones de Derechos de Autor",
      content: [
        "Respetamos los derechos de propiedad intelectual de terceros. Si consideras que algún material infringe tus derechos de autor, puedes notificárnoslo en hola@rroagencyai.com aportando la documentación acreditativa correspondiente.",
      ],
    },
    {
      id: "terms-16",
      title: "16. Plazo y Terminación",
      content: [
        "Estas Condiciones Legales permanecerán en vigor mientras utilices los Servicios. Nos reservamos el derecho a denegar, suspender o cancelar el acceso a cualquier persona en caso de incumplimiento de estos términos o de la normativa aplicable.",
      ],
    },
    {
      id: "terms-17",
      title: "17. Modificaciones e Interrupciones",
      content: [
        "Nos reservamos el derecho a modificar, suspender o interrumpir temporalmente cualquier funcionalidad de los Servicios por motivos técnicos, mejoras o mantenimiento sin previo aviso.",
      ],
    },
    {
      id: "terms-18",
      title: "18. Ley Aplicable",
      content: [
        "Estas Condiciones Legales y cualquier disputa relacionada con el acceso o uso de los Servicios se regirán e interpretarán de conformidad con la legislación vigente en España.",
        "Cualquier controversia se someterá a los Juzgados y Tribunales de la ciudad de Málaga, salvo que la Ley disponga con carácter imperativo otro fuero.",
      ],
    },
    {
      id: "terms-19",
      title: "19. Resolución de Disputas",
      content: [
        "Las partes se comprometen a intentar resolver de forma amistosa cualquier conflicto contactando previamente con hola@rroagencyai.com durante al menos 30 días naturales.",
        "En el caso de consumidores residentes en la Unión Europea, también está disponible la plataforma de resolución de litigios en línea de la Comisión Europea: ec.europa.eu/consumers/odr.",
      ],
    },
    {
      id: "terms-20",
      title: "20. Correcciones",
      content: [
        "Nos reservamos el derecho de corregir cualquier error tipográfico, inexactitud u omisión en los contenidos, precios o descripciones en cualquier momento y sin previo aviso.",
      ],
    },
    {
      id: "terms-21",
      title: "21. Descargo de Responsabilidad",
      content: [
        "LOS SERVICIOS SE PROPORCIONAN 'TAL CUAL' Y 'SEGÚN DISPONIBILIDAD'. EL USO DE LOS SERVICIOS SE REALIZA BAJO TU PROPIA RESPONSABILIDAD. RENUNCIAMOS A TODA GARANTÍA, EXPRESA O IMPLÍCITA, EN LA MEDIDA PERMITIDA POR LA LEY.",
      ],
    },
    {
      id: "terms-22",
      title: "22. Limitación de Responsabilidad",
      content: [
        "En ningún caso RRO AGENCY AI, sus directivos, empleados o colaboradores serán responsables por daños indirectos, incidentales o lucro cesante derivados del uso de los Servicios.",
        "Nuestra responsabilidad máxima acumulada estará limitada al importe total efectivamente abonado por ti en los seis (6) meses previos a la reclamación, o a dos mil (2.000) euros, el menor de ambos importes.",
      ],
    },
    {
      id: "terms-23",
      title: "23. Indemnización",
      content: [
        "Te comprometes a indemnizar y mantener indemne a RRO AGENCY AI frente a cualquier reclamación, sanción o gasto derivado de tu uso indebido de los Servicios o del incumplimiento de estas condiciones legales.",
      ],
    },
    {
      id: "terms-24",
      title: "24. Datos del Usuario",
      content: [
        "Conservamos los datos transmitidos para la correcta operativa y cumplimiento normativo. El tratamiento de los datos personales se realiza conforme a la Política de Privacidad y la normativa RGPD/LOPDGDD.",
      ],
    },
    {
      id: "terms-25",
      title: "25. Comunicaciones, Transacciones y Firmas Electrónicas",
      content: [
        "Aceptas recibir comunicaciones por vía electrónica y reconoces la validez de firmas, notificaciones, contratos y transacciones formalizados en formato digital.",
      ],
    },
    {
      id: "terms-26",
      title: "26. Mensajería a través de WhatsApp",
      content: [
        "Podemos remitir notificaciones operativas a través de WhatsApp cuando hayas otorgado tu consentimiento. Puedes darte de baja en cualquier momento respondiendo la palabra «BAJA» a nuestro número oficial.",
        "Canal de soporte de mensajería: hola@rroagencyai.com o teléfono (+34) 644 44 99 90.",
      ],
    },
    {
      id: "terms-27",
      title: "27. Misceláneos",
      content: [
        "Estas Condiciones constituyen el acuerdo íntegro entre las partes. La invalidez de cualquier disposición no afectará a la vigencia del resto de cláusulas.",
      ],
    },
    {
      id: "terms-28",
      title: "28. Garantía de Satisfacción de 30 días",
      content: [
        "En RRO Agency AI ofrecemos una garantía de satisfacción de 30 días. Si, por cualquier motivo, no quedas satisfecho con tu suscripción o servicio durante los primeros 30 días desde el pago inicial, podrás solicitar el reembolso completo de la cantidad abonada.",
        "Para ejercer este derecho, comunícalo por e-mail a hola@rroagencyai.com dentro del plazo de 30 días naturales desde la fecha de tu primer pago.",
      ],
    },
    {
      id: "terms-29",
      title: "29. Descargo de Responsabilidad sobre Ganancias",
      content: [
        "RRO Agency AI no garantiza resultados económicos, beneficios ni ingresos derivados del uso de nuestros productos o formaciones. Todos los materiales se proporcionan con fines educativos, formativos y de optimización de procesos.",
      ],
    },
    {
      id: "terms-30",
      title: "30. Contáctanos",
      content: [
        "Para cualquier consulta, solicitud de información o incidencia relacionada con los Servicios o estos Términos y Condiciones:",
        "• Correo electrónico: hola@rroagencyai.com",
        "• Teléfono: (+34) 644 21 29 29",
        "• Dirección: Calle Alejandro Dumas 17 - Oficinas, 29004 Málaga, España",
      ],
    },
  ],
};

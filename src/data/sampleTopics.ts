import { StudyMaterial } from "../types";

export const SAMPLE_STUDY_MATERIALS: Record<string, StudyMaterial> = {
  fotosintesis: {
    id: "sample_fotosintesis",
    topic: "La Fotosíntesis Completa",
    formalDefinition:
      "**¿Qué es?**: La fotosíntesis es un **proceso anabólico y endergónico** mediante el cual las células vegetales, algas y cianobacterias captan **energía lumínica solar** para sintetizar **glucosa (C₆H₁₂O₆)** y liberar **oxígeno molecular (O₂)**.\n\n**Dos Fases Acopladas**: Ocurre en el cloroplasto en dos etapas continuas: la **Fase Luminosa** en los **tilacoides** (fotólisis del agua y generación de **ATP y NADPH**) y la **Fase Oscura** o Ciclo de Calvin en el **estroma** (fijación enzimática del carbono mediante la enzima **RuBisCO**).\n\n**Ecuación Global**: **6 CO₂ + 6 H₂O + Luz Solar ➔ C₆H₁₂O₆ (Glucosa) + 6 O₂**.",
    passionExplanation:
      "⚽ **En el Fútbol**: La **clorofila** es el portero titular que atrapa a dos manos el balón de luz que chuta el sol. El **agua (H₂O)** de las raíces es el pase largo del mediocampista, y el **dióxido de carbono (CO₂)** son las órdenes tácticas del entrenador.\n\n✈️ **En los Aviones**: La luz solar actúa como el **combustible de ignición** en los reactores. Los **tilacoides** son las turbinas que generan empuje eléctrico de alta potencia (**ATP y NADPH**), y el Ciclo de Calvin es el piloto automático manteniendo la altitud de crucero.\n\n🏆 **El Gol del Triunfo**: En el área chica vegetal, el delantero estrella (la enzima **RuBisCO**) empuja el balón a la red fabricando el gol decisivo: la **glucosa**, que alimenta a todo el equipo.",
    quickTakeaways: [
      "**Ecuación balanceada:** 6 CO₂ + 6 H₂O + Luz ➔ C₆H₁₂O₆ (Glucosa) + 6 O₂.",
      "**Fase Luminosa (Tilacoides):** Rompe el agua por fotólisis, libera O₂ y genera baterías de ATP y NADPH.",
      "**Fase Oscura / Calvin (Estroma):** Usa la enzima RuBisCO para fijar CO₂ y fabricar glucosa.",
      "**Clorofila en Cloroplastos:** Pigmento verde que atrapa fotones lumínicos reflejando el verde.",
      "**Factores Limitantes:** Intensidad lumínica, concentración de CO₂, agua y temperatura ambiental.",
      "**Impacto Vital:** Base de las cadenas alimentarias y sumidero clave de carbono en la Tierra.",
    ],
    overview:
      "La fotosíntesis es el **motor biológico fundamental** que transforma la energía de los fotones solares en **alimento químico estable** y renueva el oxígeno de la atmósfera terrestre.\n\nSe organiza en dos etapas acopladas: **captura de energía** en membranas tilacoidales y **fijación química de carbono** en el estroma del cloroplasto.",
    sections: [
      {
        id: "sec1",
        title: "1. Introducción y Ecuación Química Global",
        content:
          "La fotosíntesis es una **reacción anabólica y endergónica** que sustenta las cadenas tróficas del planeta.\n\nSu ecuación química balanceada es: **6 CO₂ + 6 H₂O + Energía Lumínica ➔ C₆H₁₂O₆ (Glucosa) + 6 O₂**.\n\nLas plantas absorben el agua por las raíces y el CO₂ a través de poros microscópicos foliares llamados **estomas**.",
        keyConcepts: ["Ecuación Química", "Reactivos: CO₂ y H₂O", "Productos: Glucosa y O₂", "Estomas"],
      },
      {
        id: "sec2",
        title: "2. Fase Luminosa (Fotoquímica en los Tilacoides)",
        content:
          "Ocurre exclusivamente con luz en las membranas de los **tilacoides**, dentro de los cloroplastos.\n\nLa **clorofila** absorbe fotones, excitando electrones en una cadena de transporte. Se produce la **fotólisis del agua (ruptura de H₂O)**, liberando **O₂ gaseoso** y cargando dos moléculas de alta energía: **ATP y NADPH**.",
        keyConcepts: ["Tilacoides", "Fotólisis del Agua", "Producción de O₂", "Síntesis de ATP y NADPH"],
      },
      {
        id: "sec3",
        title: "3. Fase Oscura o Ciclo de Calvin (En el Estroma)",
        content:
          "Ocurre en el fluido interno del cloroplasto (**el estroma**) y no requiere luz directa, pero depende del **ATP y NADPH** producidos en la fase anterior.\n\nLa enzima **RuBisCO** cataliza la fijación del CO₂ atmosférico para convertirlo en moléculas de **glucosa** que nutren a la planta.",
        keyConcepts: ["Estroma", "Ciclo de Calvin", "Enzima RuBisCO", "Fijación de Carbono"],
      },
      {
        id: "sec4",
        title: "4. Factores Limitantes e Importancia Ecológica",
        content:
          "La velocidad fotosintética depende de factores clave: **intensidad lumínica**, **concentración de CO₂**, **disponibilidad de agua** y **temperatura ambiental**.\n\nEcológicamente, actúa como el **gran sumidero de carbono** del planeta y la base energética primaria de todos los ecosistemas.",
        keyConcepts: ["Factores Limitantes", "Sumidero de Carbono", "Base de la Cadena Trófica"],
      },
    ],
    mindMap: {
      id: "mm_root",
      label: "La Fotosíntesis",
      emoji: "🌿",
      color: "#059669",
      description: "Transformación biofísica de energía lumínica en alimento químico (glucosa) y oxígeno vital",
      children: [
        {
          id: "mm_reactivos",
          label: "Entradas y Reactivos",
          emoji: "💧",
          color: "#0284c7",
          description: "Elementos esenciales del medio ambiente necesarios para iniciar la reacción química",
          children: [
            {
              id: "mm_r1",
              label: "Luz Solar",
              emoji: "☀️",
              category: "Energía Primaria",
              description: "Paquetes de fotones de longitud de onda visible absorbidos por las moléculas de clorofila.",
              keyPoints: [
                "Proporciona la energía de activación para romper las moléculas de agua.",
                "La luz azul y roja se absorben al máximo; la luz verde se refleja.",
                "Sin luz directa, la fase fotoquímica inicial se detiene por completo."
              ],
              analogy: "⚽ Es el balón pateado a máxima potencia hacia la portería vegetal.",
              example: "Las plantas de sotobosque desarrollan hojas más grandes para captar hasta el último fotón disponible.",
              examTip: "Pregunta típica: ¿Qué color de luz NO aprovecha la clorofila? Respuesta: La luz verde (por eso las hojas se ven verdes).",
              quickQuestion: {
                question: "¿Qué longitudes de onda absorbe preferentemente la clorofila?",
                answer: "La luz roja y azul, reflejando la verde."
              }
            },
            {
              id: "mm_r2",
              label: "Agua (H₂O)",
              emoji: "💧",
              category: "Donador de Electrones",
              description: "Molécula líquida absorbida por ósmosis radicular y transportada por los vasos del xilema.",
              keyPoints: [
                "Aporta los electrones y protones (H⁺) indispensables para el transporte fotosintético.",
                "Su ruptura fotoquímica (fotólisis) es la fuente directa del oxígeno liberado.",
                "El 95% del agua absorbida se pierde por transpiración foliar para mantener la turgencia."
              ],
              analogy: "✈️ Es el fluido hidráulico que permite la presurización y funcionamiento de todos los controles de vuelo.",
              example: "En sequía prolongada, los estomas se cierran para no deshidratarse, frenando la fotosíntesis.",
              examTip: "¡Cuidado en el examen!: El oxígeno liberado procede del AGUA (H₂O), NUNCA del dióxido de carbono (CO₂).",
              quickQuestion: {
                question: "¿De dónde procede exactamente el O₂ que respiramos liberado por las plantas?",
                answer: "Del agua (H₂O) tras la fotólisis en la fase luminosa."
              }
            },
            {
              id: "mm_r3",
              label: "CO₂ Atmosférico",
              emoji: "💨",
              category: "Fuente de Carbono",
              description: "Gas ambiental captado pasivamente por difusión a través de los estomas de las hojas.",
              keyPoints: [
                "Aporta los átomos de carbono necesarios para formar el esqueleto de la glucosa (C₆H₁₂O₆).",
                "Ingresa y se disuelve en el estroma del cloroplasto para el Ciclo de Calvin.",
                "A mayor concentración de CO₂ (hasta cierto límite), aumenta el rendimiento fotosintético."
              ],
              analogy: "⚽ Es la estrategia táctica y las instrucciones del cuerpo técnico que dan forma al gol.",
              example: "Los invernaderos agrícolas inyectan CO₂ controlado para acelerar el crecimiento del tomate un 30%.",
              examTip: "Se fija mediante la enzima RuBisCO en la fase oscura o Ciclo de Calvin.",
              quickQuestion: {
                question: "¿A través de qué estructuras celulares foliares entra el CO₂?",
                answer: "A través de los estomas."
              }
            },
          ],
        },
        {
          id: "mm_fase_lum",
          label: "Fase Luminosa (Tilacoides)",
          emoji: "⚡",
          color: "#d97706",
          description: "Reacciones fotoquímicas en las membranas tilacoidales acopladas a la luz solar",
          children: [
            {
              id: "mm_fl1",
              label: "Clorofila y Fotosistemas",
              emoji: "🧤",
              category: "Captadores Fotoeléctricos",
              description: "Complejos antena (PSI y PSII) insertados en la membrana con pigmentos fotosintéticos.",
              keyPoints: [
                "Excita electrones a niveles cuánticos superiores gracias al impacto de los fotones.",
                "Contiene un átomo central de Magnesio (Mg²⁺) en su anillo de porfirina.",
                "Canaliza la energía hacia los centros de reacción fotoquímicos."
              ],
              analogy: "⚽ Es el portero con guantes de agarre perfecto que atrapa disparos de energía solar.",
              example: "En otoño, la degradación de la clorofila deja visibles pigmentos amarillos y naranjas (carotenoides).",
              examTip: "Recuerda que la clorofila tiene magnesio en su centro; una deficiencia de magnesio causa hojas amarillentas (clorosis).",
              quickQuestion: {
                question: "¿Qué catión metálico se encuentra en el centro de la molécula de clorofila?",
                answer: "El catión Magnesio (Mg²⁺)."
              }
            },
            {
              id: "mm_fl2",
              label: "Fotólisis del Agua",
              emoji: "💥",
              category: "Ruptura Molecular",
              description: "Disociación enzimática de la molécula de agua inducida por la luz en el Fotosistema II.",
              keyPoints: [
                "Ecuación: 2 H₂O + luz ➔ O₂ (gas) + 4 H⁺ (protones) + 4 e⁻ (electrones).",
                "Los electrones liberados reponen los perdidos por la clorofila.",
                "Es el origen biológico del 100% del oxígeno libre en la atmósfera terrestre."
              ],
              analogy: "✈️ Es la chispa de encendido que quema el carburante para despegar el avión.",
              example: "Sin fotólisis, la atmósfera primitiva de la Tierra carecía de oxígeno libre para la vida aeróbica.",
              examTip: "Ocurre en la cara interna (lumen) del tilacoide.",
              quickQuestion: {
                question: "¿Qué subproducto gaseoso se libera durante la fotólisis del agua?",
                answer: "Oxígeno molecular gaseoso (O₂)."
              }
            },
            {
              id: "mm_fl3",
              label: "Baterías Químicas (ATP y NADPH)",
              emoji: "🔋",
              category: "Monedas Energéticas",
              description: "Moléculas transportadoras de alta energía generadas por fotofosforilación y la ferredoxina.",
              keyPoints: [
                "La ATP sintasa usa el gradiente electroquímico de protones para sintetizar ATP.",
                "El NADP⁺ se reduce a NADPH, acumulando poder reductor de alta reactividad.",
                "Ambas moléculas viajan de los tilacoides al estroma para alimentar la fase oscura."
              ],
              analogy: "✈️ Son las baterías de ion de litio y acumuladores auxiliares del reactor del avión cargadas al 100%.",
              example: "Si falta luz solar, las reservas de ATP y NADPH caen en cuestión de segundos, deteniendo a RuBisCO.",
              examTip: "El ATP aporta energía química; el NADPH aporta el poder reductor (hidrógenos y electrones).",
              quickQuestion: {
                question: "¿Cuáles son las dos moléculas energéticas clave producidas en la fase luminosa?",
                answer: "El ATP (energía) y el NADPH (poder reductor)."
              }
            },
          ],
        },
        {
          id: "mm_calvin",
          label: "Ciclo de Calvin (Estroma)",
          emoji: "🔄",
          color: "#7c3aed",
          description: "Vía metabólica enzimática de fijación de carbono y síntesis de azúcares en el estroma",
          children: [
            {
              id: "mm_cc1",
              label: "Enzima RuBisCO",
              emoji: "🧬",
              category: "Catalizador Maestro",
              description: "Ribulosa-1,5-bisfosfato carboxilasa-oxigenasa, la proteína enzimática más abundante de la biosfera.",
              keyPoints: [
                "Fija el átomo de carbono del CO₂ inorgánico uniéndolo a una molécula de 5 carbonos (RuBP).",
                "Es una enzima lenta (cataliza 3-10 reacciones/seg), por lo que las plantas producen toneladas de ella.",
                "Presenta fotorrespiración cuando la concentración de oxígeno es muy alta."
              ],
              analogy: "⚽ Es el delantero centro goleador que remata cualquier balón en el área pequeña para marcar el gol.",
              example: "Constituye hasta el 50% de las proteínas solubles presentes en las hojas verdes.",
              examTip: "La RuBisCO actúa en el estroma, NO en los tilacoides.",
              quickQuestion: {
                question: "¿Cuál es la proteína enzimática más abundante del planeta y qué función tiene?",
                answer: "La RuBisCO, responsable de fijar el CO₂ en el ciclo de Calvin."
              }
            },
            {
              id: "mm_cc2",
              label: "Síntesis de Glucosa (C₆H₁₂O₆)",
              emoji: "🍬",
              category: "Producto Anabólico",
              description: "Formación de gliceraldehído-3-fosfato (G3P) que posteriormente se ensambla en glucosa y almidón.",
              keyPoints: [
                "Se requieren 6 vueltas completas del ciclo de Calvin para sintetizar una sola molécula de glucosa.",
                "Sirve como combustible para la respiración celular mitocondrial de la propia planta.",
                "Se polimeriza en celulosa (soporte estructural del tallo) y almidón (reserva subterránea).",
              ],
              analogy: "✈️ Es el combustible queroseno de aviación de alto octanaje almacenado en los depósitos de las alas.",
              example: "Las patatas y tubérculos son almacenes concentrados de glucosa convertida en almidón por la planta.",
              examTip: "Fórmula molecular de la glucosa: C₆H₁₂O₆.",
              quickQuestion: {
                question: "¿Cuántas vueltas del ciclo de Calvin se requieren para producir 1 molécula de glucosa?",
                answer: "6 vueltas (se fija 1 carbono de CO₂ por cada vuelta)."
              }
            },
            {
              id: "mm_cc3",
              label: "Fase Independiente de Luz",
              emoji: "🌙",
              category: "Regulación Térmica",
              description: "Etapa bioquímica que no consume fotones directos pero cesa si se agotan el ATP y NADPH.",
              keyPoints: [
                "Se denomina erróneamente 'fase oscura', pero ocurre fundamentalmente de día cuando hay suministro de ATP.",
                "Altamente sensible a la temperatura debido a la desnaturalización de sus enzimas.",
                "Regulada por el pH del estroma y la activación por tioredoxinas activadas por luz.",
              ],
              analogy: "⚽ Es la jugada ensayada a balón parado que se ejecuta en el vestuario con precisión matemática.",
              example: "Si la temperatura sube por encima de 40°C, las enzimas del estroma se inactivan y la producción cae.",
              examTip: "Aunque se llame 'oscura', suele ocurrir de día porque requiere la recarga continua de ATP y NADPH tilacoidal.",
              quickQuestion: {
                question: "¿Por qué el ciclo de Calvin suele detenerse en plena noche aunque no necesite luz?",
                answer: "Porque se agotan rápidamente las reservas de ATP y NADPH generadas por la luz."
              }
            },
          ],
        },
        {
          id: "mm_productos",
          label: "Productos e Impacto Vital",
          emoji: "🌍",
          color: "#e11d48",
          description: "Consecuencias biofísicas globales y sustento de toda la biosfera terrestre",
          children: [
            {
              id: "mm_p1",
              label: "Oxígeno Molecular (O₂)",
              emoji: "🫁",
              category: "Respiración Aerobia",
              description: "Gas diatómico incoloro liberado al medio que sustenta la respiración de animales y microorganismos.",
              keyPoints: [
                "Constituye aproximadamente el 21% del volumen de la atmósfera terrestre actual.",
                "Permitió la formación de la capa de ozono (O₃) estratosférica que filtra la radiación UV letal.",
                "Producido en una proporción de 6 moléculas de O₂ por cada molécula de glucosa sintetizada."
              ],
              analogy: "✈️ Es el sistema de generación de oxígeno y presurización limpia de cabina para que todos a bordo respiren.",
              example: "El fitoplancton de los océanos produce más del 50% del oxígeno que respiramos en la Tierra.",
              examTip: "Ecuación estequiométrica: 6 CO₂ + 6 H₂O ➔ C₆H₁₂O₆ + 6 O₂.",
              quickQuestion: {
                question: "¿Qué porcentaje aproximado del oxígeno atmosférico terrestre produce el fitoplancton marino?",
                answer: "Más del 50% del oxígeno total del planeta."
              }
            },
            {
              id: "mm_p2",
              label: "Glucosa y Almidón",
              emoji: "🌾",
              category: "Base Nutricional",
              description: "Monosacárido y polisacárido que proporcionan nutrición química a todos los eslabones tróficos.",
              keyPoints: [
                "Sustenta a los herbívoros (consumidores primarios) y a toda la pirámide alimentaria.",
                "Se polimeriza en celulosa, el compuesto orgánico más abundante del planeta.",
                "Base de la madera, algodón, fibras textiles, trigo, arroz y maíz."
              ],
              analogy: "⚽ Es el trofeo de la Champions League y el catering nutricional para todo el club deportivo.",
              example: "El pan, los cereales y la fruta son directamente polímeros de glucosa sintetizados por plantas.",
              examTip: "Almacenamiento: en plantas es almidón; en animales la glucosa se almacena como glucógeno.",
              quickQuestion: {
                question: "¿En qué forma almacenan las plantas el exceso de glucosa?",
                answer: "En forma de almidón (amilosa y amilopectina)."
              }
            },
            {
              id: "mm_p3",
              label: "Sumidero de Carbono y Clima",
              emoji: "🛡️",
              category: "Equilibrio Planetario",
              description: "Secuestro masivo de carbono ambiental que regula el efecto invernadero del planeta.",
              keyPoints: [
                "Los bosques y océanos absorben miles de millones de toneladas de CO₂ al año.",
                "Evita el calentamiento descontrolado de la atmósfera reteniendo el carbono en biomasa sólida.",
                "Su degradación por deforestación acelera directamente la crisis climática."
              ],
              analogy: "⚽ Es la defensa de cinco hombres bien plantada que neutraliza todos los ataques del rival.",
              example: "La selva amazónica y las turberas fijan tanto carbono que se consideran estabilizadores térmicos mundiales.",
              examTip: "La fotosíntesis es el único proceso natural biológico capaz de retirar CO₂ a escala planetaria.",
              quickQuestion: {
                question: "¿Por qué la fotosíntesis es crucial contra el cambio climático?",
                answer: "Porque absorbe y secuestra toneladas de CO₂ atmosférico en forma de biomasa vegetal."
              }
            },
          ],
        },
      ],
    },
    selectedPassions: ["Fútbol", "Aviones"],
    keyPoints: [
      "**Ecuación global:** 6 CO₂ + 6 H₂O + Luz ➔ C₆H₁₂O₆ (Glucosa) + 6 O₂.",
      "**Fase luminosa:** Ocurre en los **tilacoides**; la **fotólisis del agua** libera **O₂** y recarga **ATP + NADPH**.",
      "**Fase oscura (Calvin):** Ocurre en el **estroma**; la enzima **RuBisCO** fija el CO₂ para crear **glucosa**.",
      "**Pigmento verde:** La **clorofila** capta los fotones de luz solar en los cloroplastos.",
      "**Factores de rendimiento:** Depende de la **luz**, **CO₂**, **agua** y **temperatura ambiental**.",
      "**Importancia ecológica:** Es el principal **sumidero de carbono** del planeta y base de la vida.",
    ],
    analogies: [
      {
        passion: "Fútbol",
        concept: "La Clorofila",
        analogy:
          "La clorofila es el portero estrella: atrapa los balonazos de luz solar que le manda el sol y los pasa limpios a su equipo para generar energía.",
        takeaway: "Clorofila = Portero atrapando disparos de luz.",
      },
      {
        passion: "Aviones",
        concept: "La Glucosa",
        analogy:
          "La glucosa es el queroseno de avión de alta calidad: el combustible concentrado que la planta almacena para tener potencia y crecer.",
        takeaway: "Glucosa = Combustible de avión para la planta.",
      },
    ],
    flashcards: [
      {
        id: "fc1",
        front: "¿Qué hace la clorofila?",
        back: "Atrapa la luz del sol para transformarla en energía química.",
        analogyHint: "⚽ Piensa en los guantes del arquero atrapando el balón.",
      },
      {
        id: "fc2",
        front: "¿Qué entra y qué sale de la fotosíntesis?",
        back: "Entran: Luz, Agua y CO₂. Salen: Glucosa y Oxígeno.",
        analogyHint: "✈️ Combustible que entra al reactor y empuje limpio que sale.",
      },
      {
        id: "fc3",
        front: "¿En qué parte de la célula vegetal ocurre?",
        back: "En los cloroplastos.",
        analogyHint: "⚽ Es el estadio donde se juega todo el partido.",
      },
      {
        id: "fc4",
        front: "¿Por qué las hojas son verdes?",
        back: "Porque la clorofila refleja la luz verde y absorbe la roja y azul.",
        analogyHint: "⚽ Como la camiseta del equipo local.",
      },
    ],
    quizQuestions: [
      {
        id: "q1",
        question: "¿Qué gas necesitan las plantas para fabricar glucosa?",
        options: ["Dióxido de Carbono (CO₂)", "Oxígeno (O₂)", "Helio (He)", "Metano (CH₄)"],
        correctIndex: 0,
        explanation: "El CO₂ del aire es la materia prima para fabricar los azúcares.",
        analogyExplanation: "⚽ Es el balón inicial que se pone en el punto central.",
      },
      {
        id: "q2",
        question: "¿Cuál es el producto vital que liberan las plantas al aire?",
        options: ["Oxígeno (O₂)", "Nitrógeno", "Monóxido de carbono", "Vapor de mercurio"],
        correctIndex: 0,
        explanation: "Al romper la molécula de agua, liberan oxígeno puro al aire.",
        analogyExplanation: "✈️ Aire presurizado y limpio en cabina.",
      },
      {
        id: "q3",
        question: "¿Dónde se ubica la clorofila dentro de la célula?",
        options: ["En los cloroplastos", "En el núcleo", "En la pared exterior", "En las raíces"],
        correctIndex: 0,
        explanation: "Los cloroplastos son los orgánulos especializados donde se realiza la fotosíntesis.",
        analogyExplanation: "⚽ La cancha de juego.",
      },
    ],
    trueFalseQuestions: [
      {
        id: "tf1",
        statement: "La fotosíntesis produce glucosa (alimento) y libera oxígeno.",
        isTrue: true,
        explanation: "¡Correcto! Es la fábrica natural de alimento y aire limpio.",
      },
      {
        id: "tf2",
        statement: "Las plantas solo pueden hacer fotosíntesis en total oscuridad.",
        isTrue: false,
        explanation: "Falso: necesitan indispensablemente la luz del sol.",
      },
      {
        id: "tf3",
        statement: "La clorofila es el pigmento que da color verde a las hojas.",
        isTrue: true,
        explanation: "¡Correcto! Refleja la longitud de onda verde.",
      },
    ],
    matchPairs: [
      { id: "m1", term: "Clorofila", definition: "Portero que atrapa la luz" },
      { id: "m2", term: "Glucosa", definition: "Combustible de avión para crecer" },
      { id: "m3", term: "Cloroplasto", definition: "El estadio donde ocurre la magia" },
    ],
    fillBlanks: [
      {
        id: "fb1",
        sentenceWithBlank: "Las plantas absorben agua del suelo y ____ del aire.",
        answer: "CO₂",
        options: ["CO₂", "Metano", "Gas noble", "Argón"],
        hint: "⚽ El gas que exhalamos.",
      },
      {
        id: "fb2",
        sentenceWithBlank: "El pigmento verde que atrapa la luz se llama ____.",
        answer: "Clorofila",
        options: ["Clorofila", "Queratina", "Melanina", "Colágeno"],
        hint: "✈️ El sensor frontal del avión.",
      },
    ],
    animatedVideo: {
      id: "vid_sample_fotosintesis",
      topic: "La Fotosíntesis Completa",
      title: "Masterclass Animada: La Fotosíntesis Paso a Paso",
      description: "Recorrido visual completo desde la absorción de fotones en los tilacoides hasta la síntesis de glucosa por RuBisCO en el estroma.",
      totalDurationSeconds: 92,
      style: "whiteboard",
      createdAt: new Date().toISOString(),
      scenes: [
        {
          id: "sc_foto_1",
          sceneNumber: 1,
          title: "1. La Gran Pregunta de la Biosfera",
          subtitle: "¿Cómo transforma una hoja verde la luz del sol en vida?",
          durationSeconds: 15,
          narration: "¿Alguna vez te has preguntado cómo un árbol gigante crece a partir del aire y la luz solar? La fotosíntesis es el motor biológico supremo que produce todo el oxígeno que respiramos.",
          sceneType: "intro",
          themeColor: "#059669",
          badgeEmoji: "🌿",
          elements: [
            { id: "e1", type: "heading", content: "La Fotosíntesis Molecular", highlight: "Motor de la Biosfera", timingPercent: 10, animation: "pop" },
            { id: "e2", type: "text", content: "Reacción anabólica y endergónica que convierte fotones solares en glucosa y oxígeno vital.", timingPercent: 30, animation: "fade_in" },
            { id: "e3", type: "badge", content: "Objetivo: Dominar las dos fases y la ecuación balanceada", icon: "Target", timingPercent: 65, animation: "slide_up" },
          ],
          keyTakeaway: "Sin fotosíntesis no existiría vida aeróbica en la Tierra.",
        },
        {
          id: "sc_foto_2",
          sceneNumber: 2,
          title: "2. La Ecuación Química Global",
          subtitle: "Los reactivos que entran y los productos que salen",
          durationSeconds: 16,
          narration: "En un examen de ciencias, esta ecuación vale oro: seis moléculas de dióxido de carbono y seis de agua, impulsadas por fotones de luz, se transforman en una molécula de glucosa y seis de oxígeno.",
          sceneType: "formula",
          themeColor: "#0284c7",
          badgeEmoji: "🔬",
          elements: [
            { id: "e4", type: "formula_box", content: "6 CO₂ + 6 H₂O + Luz Solar ➔ C₆H₁₂O₆ (Glucosa) + 6 O₂", highlight: "Ecuación Balanceada", timingPercent: 15, animation: "draw_border" },
            { id: "e5", type: "bullet", content: "El agua aporta electrones e hidrógenos; el CO₂ aporta el esqueleto de carbono.", timingPercent: 55, animation: "slide_up" },
          ],
          visualDiagram: {
            type: "flow",
            nodes: [
              { id: "n1", label: "6 CO₂ + 6 H₂O", sublabel: "Reactivos de entrada", icon: "Layers", color: "#0284c7" },
              { id: "n2", label: "Cloroplasto", sublabel: "Fábrica celular", icon: "Zap", color: "#f59e0b" },
              { id: "n3", label: "Glucosa + 6 O₂", sublabel: "Alimento + Oxígeno", icon: "CheckCircle", color: "#10b981" },
            ],
            arrows: [
              { from: "n1", to: "n2", label: "Luz solar" },
              { from: "n2", to: "n3", label: "Síntesis" },
            ],
          },
          keyTakeaway: "Memoriza los coeficientes estequiométricos: 6, 6, 1 y 6.",
        },
        {
          id: "sc_foto_3",
          sceneNumber: 3,
          title: "3. Fase Luminosa en los Tilacoides",
          subtitle: "Fotólisis del agua y recarga de baterías moleculares",
          durationSeconds: 17,
          narration: "Dentro del cloroplasto, en unas membranas llamadas tilacoides, la clorofila absorbe luz. Rompe la molécula de agua liberando oxígeno gaseoso, y carga dos baterías de energía: ATP y NADPH.",
          sceneType: "diagram",
          themeColor: "#10b981",
          badgeEmoji: "⚡",
          elements: [
            { id: "e6", type: "flow_step", content: "1. La clorofila capta fotones y excita electrones", timingPercent: 15, animation: "slide_up" },
            { id: "e7", type: "flow_step", content: "2. Fotólisis: se rompe H₂O liberando O₂ gaseoso", timingPercent: 45, animation: "slide_up" },
            { id: "e8", type: "flow_step", content: "3. Se cargan las baterías químicas de ATP y NADPH", timingPercent: 75, animation: "glow" },
          ],
          visualDiagram: {
            type: "flow",
            nodes: [
              { id: "f1", label: "H₂O + Fotones", sublabel: "Entrada lumínica", icon: "Flame", color: "#0284c7" },
              { id: "f2", label: "Tilacoides", sublabel: "Membrana activa", icon: "Zap", color: "#10b981" },
              { id: "f3", label: "O₂ + ATP/NADPH", sublabel: "Baterías listas", icon: "CheckCircle", color: "#f59e0b" },
            ],
            arrows: [
              { from: "f1", to: "f2" },
              { from: "f2", to: "f3" },
            ],
          },
          keyTakeaway: "El oxígeno liberado procede del agua (H₂O), jamás del CO₂.",
        },
        {
          id: "sc_foto_4",
          sceneNumber: 4,
          title: "4. Fase Oscura o Ciclo de Calvin",
          subtitle: "La enzima RuBisCO en el estroma hornea la glucosa",
          durationSeconds: 18,
          narration: "En el fluido interno llamado estroma, ocurre el milagro de la fijación de carbono. La enzima RuBisCO atrapa el dióxido de carbono y, gastando la energía del ATP y NADPH, fabrica azúcares.",
          sceneType: "whiteboard",
          themeColor: "#7c3aed",
          badgeEmoji: "🔄",
          elements: [
            { id: "e9", type: "formula_box", content: "CO₂ + RuBisCO + ATP/NADPH ➔ C₆H₁₂O₆ (Glucosa)", highlight: "Fijación Enzimática", timingPercent: 15, animation: "pop" },
            { id: "e10", type: "bullet", content: "RuBisCO es la proteína y enzima más abundante del planeta Tierra.", timingPercent: 55, animation: "fade_in" },
          ],
          visualDiagram: {
            type: "cycle",
            nodes: [
              { id: "c1", label: "CO₂ Atmosférico", sublabel: "Carbono fijado", icon: "Layers", color: "#7c3aed" },
              { id: "c2", label: "Enzima RuBisCO", sublabel: "Catalizador estroma", icon: "Zap", color: "#f59e0b" },
              { id: "c3", label: "Glucosa", sublabel: "Azúcar estable", icon: "CheckCircle", color: "#10b981" },
            ],
            arrows: [
              { from: "c1", to: "c2" },
              { from: "c2", to: "c3" },
            ],
          },
          keyTakeaway: "La fase oscura no requiere fotones directos, pero sí la energía generada de día.",
        },
        {
          id: "sc_foto_5",
          sceneNumber: 5,
          title: "5. Puntos Trampa de Examen",
          subtitle: "Los fallos típicos que el examinador busca penalizar",
          durationSeconds: 14,
          narration: "¡Mucho ojo aquí! En los exámenes suelen preguntar si la fase oscura ocurre de noche: la respuesta es no, se llama así porque no usa luz directa, pero necesita las baterías diurnas de los tilacoides.",
          sceneType: "whiteboard",
          themeColor: "#e11d48",
          badgeEmoji: "🚨",
          elements: [
            { id: "e11", type: "callout", content: "¡Trampa nº1! El oxígeno proviene de la ruptura del agua en la fotólisis, no del dióxido de carbono.", highlight: "Pregunta Típica de Examen", timingPercent: 15, animation: "bounce" },
            { id: "e12", type: "bullet", content: "Tilacoides = Fase Luminosa (O₂). Estroma = Fase Oscura (Glucosa).", timingPercent: 55, animation: "fade_in" },
          ],
          keyTakeaway: "Diferencia siempre Tilacoides (luz) de Estroma (azúcar).",
        },
        {
          id: "sc_foto_6",
          sceneNumber: 6,
          title: "6. Resumen de Élite y Conclusión",
          subtitle: "La regla de oro definitiva para sacar un 10",
          durationSeconds: 12,
          narration: "¡Extraordinario! Ya tienes la visión global: luz y agua en tilacoides generan oxígeno y baterías energéticas; RuBisCO en el estroma fija CO₂ y crea glucosa. ¡Estás listo para cualquier reto!",
          sceneType: "summary",
          themeColor: "#4f46e5",
          badgeEmoji: "🏆",
          elements: [
            { id: "e13", type: "bullet", content: "Fase Luminosa: Tilacoides, fotólisis de H₂O, produce O₂, ATP y NADPH.", icon: "CheckCircle", timingPercent: 15, animation: "pop" },
            { id: "e14", type: "bullet", content: "Fase Oscura / Calvin: Estroma, enzima RuBisCO, fija CO₂ y crea glucosa.", icon: "CheckCircle", timingPercent: 45, animation: "pop" },
            { id: "e15", type: "bullet", content: "Ecuación: 6 CO₂ + 6 H₂O + Luz ➔ Glucosa + 6 O₂.", icon: "CheckCircle", timingPercent: 75, animation: "glow" },
          ],
          keyTakeaway: "¡Dominas la fotosíntesis como un biólogo profesional!",
        },
      ],
    },
    createdAt: new Date().toISOString(),
  },
};

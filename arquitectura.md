# Arquitectura del Proyecto – VITO Mobile App

## Descripción General

VITO es una aplicación móvil desarrollada en **React Native** con **TypeScript**.
La aplicación se conecta a un backend en **Supabase** para autenticación, almacenamiento y persistencia de datos, a **Health Connect** (mediante módulos nativos de Android) para la recolección de datos de salud y biométricos, y consumirá un servicio externo para funcionalidades de Machine Learning.

---

# Stack Tecnológico

## Mobile App

* **Framework:** React Native
* **Lenguaje:** TypeScript / JavaScript
* **Navegación:** React Navigation v7
* **Manejo de estado:** Context API de React
* **Estilizado y UI:** React Native StyleSheet y Componentes base
* **Integración Nativa:** Native Modules en Java (Android) para Health Connect

---

## Backend y Servicios

### Supabase

Utilizado como Backend-as-a-Service (BaaS) mediante `@supabase/supabase-js`.

Responsabilidades:

* Autenticación de usuarios
* Base de datos PostgreSQL
* Storage de archivos
* APIs y acceso a datos remotos

### Servicio de Machine Learning (Externo)

* **Entorno de Entrenamiento:** Python (en el directorio `ml-trainer`)
* **Framework Planificado:** FastAPI (servicio HTTP)
* **Función:**
    * Procesamiento de datos biométricos
    * Predicciones del modelo de Machine Learning
    * Comunicación mediante endpoints REST

---

# Arquitectura General

```text
React Native App (TypeScript)
        │
        ├── Módulos Nativos (Android - Java)
        │     └── Health Connect (Datos biométricos locales)
        │
        ├── Supabase
        │     ├── PostgreSQL
        │     ├── Storage
        │     └── Authentication
        │
        └── FastAPI ML Service
              └── Modelo de Machine Learning (entrenado en ml-trainer)
```

---

# Estructura del Proyecto

```text
/
├── android/            # Proyecto nativo Android (Módulos de Health Connect en Java)
├── ios/                # Proyecto nativo iOS
├── ml-trainer/         # Scripts y notebooks de Python para entrenamiento ML
├── src/                # Código fuente de React Native
│   ├── components/     # Componentes de UI reutilizables
│   ├── context/        # Estado global (HealthProvider, SupabaseProvider)
│   ├── data/           # Mocks y utilidades de datos
│   ├── navigation/     # Configuración de React Navigation
│   ├── screens/        # Pantallas de la aplicación
│   ├── services/       # Integración con APIs y Módulos Nativos (VitoHealthNative.ts, supabase/)
│   ├── theme/          # Constantes de diseño y estilos globales
│   └── types/          # Definiciones de tipos e interfaces de TypeScript
├── package.json        # Dependencias de Node.js
└── App.tsx             # Punto de entrada de la aplicación React Native
```

---

# Reglas de Arquitectura

## UI y Componentes

* Toda la UI se realiza con componentes funcionales de React.
* Mantener la lógica de presentación separada de la lógica de negocio usando custom hooks cuando la complejidad lo amerite.
* Las pantallas (`screens/`) deben orquestar componentes más pequeños y reutilizables (`components/`).

## Estado

* El estado global y la inyección de dependencias simples se manejan con React Context (`src/context/`).
* El estado local de la UI se administra con hooks nativos (`useState`, `useReducer`).

## Concurrencia y APIs

* Usar `async/await` y Promesas para operaciones asíncronas.
* Las llamadas a Supabase y servicios nativos deben estar aisladas en `src/services/` o provistas por el Contexto.
* Evitar inicializar conexiones pesadas o llamadas de red innecesarias directamente en los renders.

## Navegación

* Se utiliza `React Navigation v7`.
* Las rutas se definen de manera centralizada en la carpeta `src/navigation/`.

## Integración con APIs Nativas (Health Connect)

* La lectura de datos de salud se realiza de forma nativa a través de un módulo escrito en Java dentro del proyecto Android (`VitoHealthModule`).
* El código JS/TS de la aplicación invoca estas funciones nativas de forma asíncrona mediante el wrapper en `src/services/VitoHealthNative.ts`.

---

# Integración con Machine Learning

El servicio FastAPI se encargará de:

* Recibir la información de salud y biométrica previamente extraída de Health Connect.
* Ejecutar inferencias mediante el modelo ML entrenado.
* Retornar predicciones y recomendaciones personalizadas.

La app React Native:

* Consume el servicio ML vía peticiones HTTP REST.
* No ejecuta la inferencia de forma local para evitar consumo excesivo de recursos.
* Muestra los insights y métricas ya procesadas en las vistas de la app.

---

# Objetivo de Esta Arquitectura

Esta arquitectura fue elegida para:

* Permitir un desarrollo ágil y multiplataforma, optimizando tiempos al usar React Native.
* Garantizar tipos seguros y reducción de errores con TypeScript.
* Mantener control específico en características de la plataforma mediante la implementación de Native Modules cuando sea necesario (como Health Connect).
* Separar claramente la lógica de negocio/servicios de la presentación.

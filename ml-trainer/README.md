# ML Trainer — VITO Risk Prediction

## Descripción

Pipeline de entrenamiento del modelo de predicción de riesgo cardiovascular
para la app VITO Health Connect.

## Estructura

```
ml-trainer/
├── data/              # Dataset (no versionado)
├── notebooks/         # EDA y experimentación en Jupyter
├── src/
│   ├── label_data.py  # Etiquetado automático según umbrales
│   ├── features.py    # Feature engineering
│   ├── train.py       # Pipeline de entrenamiento
│   └── evaluate.py    # Métricas y validación
├── models/            # Modelo exportado .tflite + metadatos (no versionado)
├── requirements.txt
└── README.md
```

## Setup

```bash
cd ml-trainer
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Uso

1. Colocar el dataset en `data/dataset.csv`
2. Etiquetar: `python src/label_data.py`
3. Feature engineering: `python src/features.py`
4. Entrenar: `python src/train.py`
5. Evaluar: `python src/evaluate.py`

Aquí hay las formas más prácticas, ordenadas por complejidad:

## 1. **Embebido directo en el prompt (más simple)**
```python
system_prompt = """Eres un asistente especializado en Python.

CONTEXTO BASE:
- Python 3.11+ es la versión soportada
- Usa type hints en todas las funciones
- Prefiere async/await para I/O

DOCUMENTACIÓN CLAVE:
- requests: https://requests.readthedocs.io
- FastAPI: https://fastapi.tiangolo.com

Responde siempre en español.
"""

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system=system_prompt,
    messages=[{"role": "user", "content": "¿Cómo hago una petición HTTP?"}]
)
```

**Pros:** Simple, sin latencia adicional  
**Contras:** Limitado por tamaño de token; no escala bien

---

## 2. **Context injection dinámico (recomendado para balance)**
```python
def get_system_prompt(context_type: str) -> str:
    base_prompt = "Eres un asistente de desarrollo especializado."
    
    contexts = {
        "fastapi": """
FASTAPI BASICS:
- @app.get("/path") para GET
- Response models con Pydantic
- Dependency Injection con Depends()
        """,
        "database": """
DATABASE PATTERNS:
- SQLAlchemy ORM para queries
- Migrations con Alembic
- Connection pooling recomendado
        """
    }
    
    return base_prompt + (contexts.get(context_type, ""))

# Uso
user_question = "¿Cómo valido datos en FastAPI?"
system = get_system_prompt("fastapi")
```

**Pros:** Flexible, controlas qué contexto enviar  
**Contras:** Requiere lógica para seleccionar contexto

---

## 3. **Archivo YAML/JSON para mantener conocimiento base**
```yaml
# knowledge_base.yaml
system_prompt:
  role: "Asistente especializado en desarrollo"
  language: "es"
  
knowledge:
  python:
    - "Versión mínima: 3.9"
    - "Type hints obligatorios"
    - "PEP 8 compliance"
  
  frameworks:
    fastapi:
      - "Use Pydantic para validación"
      - "Async endpoints por defecto"
    
  prohibido:
    - "Usar print() en logs - usa logging"
    - "Dejar secrets en código"
```

```python
import yaml

def load_knowledge_base(file: str) -> str:
    with open(file) as f:
        kb = yaml.safe_load(f)
    
    prompt = f"Rol: {kb['system_prompt']['role']}\n\n"
    prompt += "CONOCIMIENTO BASE:\n"
    
    for topic, rules in kb['knowledge'].items():
        prompt += f"\n{topic}:\n"
        for rule in rules:
            prompt += f"  - {rule}\n"
    
    return prompt
```

**Pros:** Separación de contenido, fácil mantener  
**Contras:** Overhead de parsear archivo

---

## ⚡ **Recomendación según tu caso**

| Situación | Opción |
|-----------|--------|
| <5KB de contexto, estático | **#1 Embebido** |
| Contexto varía por tema, <20KB | **#2 Inyección dinámica** |
| Necesitas versionear el conocimiento | **#3 YAML/JSON** |
| Más de 50KB o necesitas actualizar sin redeploy | **RAG completo** |

---

## 🎯 **Consejo práctico**
Usa **combinación #1 + #2**:
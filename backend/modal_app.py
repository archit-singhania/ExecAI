"""
Deploy the CEO.ai FastAPI backend on Modal (free Starter tier).

Usage:
    modal serve backend/modal_app.py     
    modal deploy backend/modal_app.py    

Env vars are pulled from a Modal Secret named "ceo-ai-secrets" (create it once, see README notes
at the bottom of this file / the chat instructions).
"""

import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install_from_requirements("requirements.txt")
    .add_local_python_source("app")  
)

app = modal.App("ceo-ai-backend", image=image)


@app.function(
    secrets=[modal.Secret.from_name("ceo-ai-secrets")],
    min_containers=0,  
)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def fastapi_app():
    from app.main import app as web_app  

    return web_app

from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Test server working"}

@app.get("/api/data/list")
async def test_data_list():
    return {"files": [], "message": "Test endpoint working"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000) 
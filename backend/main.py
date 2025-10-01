from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import chromadb
from chromadb.config import Settings
import openai
from typing import List, Optional
import PyPDF2
import docx
import io
import json
from datetime import datetime

load_dotenv()

app = FastAPI(title="Lexsy Legal Assistant API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI configuration
openai.api_key = os.getenv("OPENAI_API_KEY")

# ChromaDB configuration
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma")
os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

chroma_client = chromadb.Client(Settings(
    persist_directory=CHROMA_PERSIST_DIR,
    anonymized_telemetry=False
))

# Initialize collections for each client
def get_or_create_collection(client_id: str):
    collection_name = f"client_{client_id}"
    try:
        return chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    except Exception as e:
        print(f"Error creating collection: {e}")
        return chroma_client.get_or_create_collection(name=collection_name)

# Text extraction functions
def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_content))
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
        return ""

def extract_text_from_txt(file_content: bytes) -> str:
    try:
        return file_content.decode('utf-8')
    except:
        return file_content.decode('latin-1')

# Chunking function
def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

# Generate embeddings using OpenAI
def get_embeddings(texts: List[str]) -> List[List[float]]:
    try:
        response = openai.embeddings.create(
            model="text-embedding-ada-002",
            input=texts
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Lexsy Legal Assistant API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/documents/{client_id}/upload")
async def upload_document(client_id: str, file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # Extract text based on file type
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(content)
        elif filename.endswith('.docx'):
            text = extract_text_from_docx(content)
        elif filename.endswith('.txt'):
            text = extract_text_from_txt(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text extracted from document")
        
        # Chunk the text
        chunks = chunk_text(text)
        
        # Get collection
        collection = get_or_create_collection(client_id)
        
        # Generate embeddings
        embeddings = get_embeddings(chunks)
        
        # Store in ChromaDB
        ids = [f"{file.filename}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "filename": file.filename,
                "type": "document",
                "chunk_index": i,
                "client_id": client_id
            }
            for i in range(len(chunks))
        ]
        
        collection.add(
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks_processed": len(chunks),
            "message": f"Successfully processed {file.filename}"
        }
    
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gmail/{client_id}/ingest-mock")
async def ingest_mock_gmail(client_id: str):
    """Ingest the mock Gmail thread about advisor equity grant"""
    try:
        mock_emails = [
            {
                "from": "alex@founderco.com",
                "to": "legal@lexsy.com",
                "subject": "Advisor Equity Grant for Lexsy, Inc.",
                "date": "July 22, 2025",
                "body": """Hi Kristina,

We'd like to bring on a new advisor for Lexsy, Inc.

* Name: John Smith
* Role: Strategic Advisor for AI/VC introductions
* Proposed grant: 15,000 RSAs (restricted stock)
* Vesting: 2-year vest, monthly, no cliff

Could you confirm if we have enough shares available under our Equity Incentive Plan (EIP) and prepare the necessary paperwork?

Thanks, Alex"""
            },
            {
                "from": "legal@lexsy.com",
                "to": "alex@founderco.com",
                "subject": "Re: Advisor Equity Grant for Lexsy, Inc.",
                "date": "July 22, 2025",
                "body": """Hi Alex,

Thanks for the details!

We can handle this.

We will:
1. Check EIP availability to confirm 15,000 shares are free to grant.
2. Draft:
   * Advisor Agreement
   * Board Consent authorizing the grant
   * Stock Purchase Agreement (if RSAs)

Please confirm:
* Vesting starts at the effective date of the agreement, meaning whenever we prepare it—or should it start earlier?

Best, Kristina"""
            }
        ]
        
        collection = get_or_create_collection(client_id)
        
        # Process each email
        all_chunks = []
        all_metadatas = []
        
        for idx, email in enumerate(mock_emails):
            email_text = f"""
Subject: {email['subject']}
From: {email['from']}
To: {email['to']}
Date: {email['date']}

{email['body']}
"""
            chunks = chunk_text(email_text, chunk_size=500)
            
            for chunk_idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadatas.append({
                    "type": "email",
                    "subject": email['subject'],
                    "from": email['from'],
                    "to": email['to'],
                    "date": email['date'],
                    "email_index": idx,
                    "chunk_index": chunk_idx,
                    "client_id": client_id
                })
        
        # Generate embeddings
        embeddings = get_embeddings(all_chunks)
        
        # Store in ChromaDB
        ids = [f"email_{i}" for i in range(len(all_chunks))]
        
        collection.add(
            embeddings=embeddings,
            documents=all_chunks,
            metadatas=all_metadatas,
            ids=ids
        )
        
        return {
            "success": True,
            "emails_processed": len(mock_emails),
            "chunks_created": len(all_chunks),
            "message": f"Successfully ingested {len(mock_emails)} emails"
        }
    
    except Exception as e:
        print(f"Gmail ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/{client_id}/ask")
async def ask_question(client_id: str, question: str = Form(...)):
    try:
        # Get collection
        collection = get_or_create_collection(client_id)
        
        # Check if collection has documents
        count = collection.count()
        if count == 0:
            return {
                "success": True,
                "answer": "No documents or emails have been uploaded yet. Please upload documents or load Gmail emails first.",
                "sources": []
            }
        
        # Generate embedding for question
        question_embedding = get_embeddings([question])[0]
        
        # Query ChromaDB
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=min(5, count)
        )
        
        # Extract relevant context
        contexts = results['documents'][0]
        metadatas = results['metadatas'][0]
        
        # Build context string
        context_str = "\n\n---\n\n".join(contexts)
        
        # Generate answer using GPT
        system_prompt = """You are a legal AI assistant for lawyers. Answer questions based on the provided documents and emails. 
Be specific, cite sources when possible, and maintain a professional tone. If you cannot answer based on the context, say so."""
        
        user_prompt = f"""Context from documents and emails:

{context_str}

Question: {question}

Please provide a clear, concise answer based on the context above."""
        
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        answer = response.choices[0].message.content
        
        # Format sources
        sources = []
        for metadata in metadatas:
            source_info = {
                "type": metadata.get("type", "unknown")
            }
            
            if metadata["type"] == "email":
                source_info["subject"] = metadata.get("subject", "")
                source_info["from"] = metadata.get("from", "")
            else:
                source_info["filename"] = metadata.get("filename", "")
            
            # Avoid duplicates
            if source_info not in sources:
                sources.append(source_info)
        
        return {
            "success": True,
            "answer": answer,
            "sources": sources[:3]  # Limit to top 3 sources
        }
    
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

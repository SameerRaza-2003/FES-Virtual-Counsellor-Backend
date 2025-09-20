import os
import re
from collections import defaultdict
from typing import List, Dict, Any
from openai import OpenAI
from pinecone import Pinecone

# =============================================
# 🔑 API KEYS (as requested, embedded directly)
# =============================================
#apikeys were here

# =============================================
# ⚙️ CONFIG
# =============================================
INDEX_NAME = "fes-embeddings-data"     # your Pinecone index
NAMESPACES = ["fes_blogs", "idp_blogs", "fes_pages", "fes_contact_details"]

# Retrieval knobs
TOP_K_PER_NS = 5         # how many per namespace
MAX_MATCHES = 20         # global cap before dedupe
MAX_CHARS_CONTEXT = 9000 # how much context we pass to the LLM

# =============================================
# 🔧 INIT CLIENTS
# =============================================
client = OpenAI(api_key=OPENAI_API_KEY)
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# =============================================
# 🧭 ROUTER (LLM)
# =============================================
def classify_query(query: str) -> str:
    """
    Returns a string like:
      'fes_blogs + idp_blogs'
      'fes_pages'
      'fes_contact_details'
    """
    system_prompt = """You are a routing assistant for FES Bot.
Decide which dataset(s) should be searched for the user's query.

Options:
- fes_blogs           (FES blog articles: study abroad guidance, scholarships, tips)
- idp_blogs           (IDP blog articles: general industry info, tests, scholarships)
- fes_pages           (FES service pages: admissions help, process, countries, offerings)
- fes_contact_details (branch addresses, phone numbers, emails)

Rules:
- Return ONLY the dataset name(s) separated by ' + ' when multiple apply.
- If the query is contact/location/phone/email/branch/office oriented → include ONLY fes_contact_details.
- If the query is specifically about FES services/process → fes_pages.
- If the query is general guidance/scholarships/testing → fes_blogs and/or idp_blogs (prefer including fes_blogs if unsure).
- No extra words.
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )
    return resp.choices[0].message.content.strip()

# =============================================
# 🧠 EMBEDDINGS
# =============================================
def embed_query(query: str) -> List[float]:
    emb = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    return emb.data[0].embedding

# =============================================
# 🔎 RETRIEVAL
# =============================================
def pinecone_search(namespaces: List[str], query_vector: List[float], top_k: int = TOP_K_PER_NS):
    all_matches = []
    for ns in namespaces:
        try:
            res = index.query(
                namespace=ns.strip(),
                vector=query_vector,
                top_k=top_k,
                include_metadata=True
            )
            for m in res.matches:
                all_matches.append({
                    "namespace": ns.strip(),
                    "id": m.id,
                    "score": m.score,
                    "metadata": m.metadata or {}
                })
        except Exception as e:
            print(f"⚠️ Query error in namespace '{ns}': {e}")
    # sort by score desc and cap
    all_matches.sort(key=lambda x: x["score"], reverse=True)
    return all_matches[:MAX_MATCHES]

def smart_title(meta: Dict[str, Any]) -> str:
    return meta.get("title") or meta.get("branch_name") or meta.get("slug") or "Untitled"

def source_ref(meta: Dict[str, Any]) -> str:
    # For lightweight citation lines
    t = smart_title(meta)
    link = meta.get("link") or meta.get("url") or ""
    src = meta.get("source") or ""
    parts = [t]
    if src: parts.append(f"[{src}]")
    if link: parts.append(f"({link})")
    return " ".join(parts).strip()

def dedupe_by_page(matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge/keep the best chunk per (slug or link or title) to avoid repetition.
    """
    groups = {}
    for m in matches:
        meta = m["metadata"]
        key = meta.get("slug") or meta.get("link") or meta.get("url") or smart_title(meta)
        if key not in groups or m["score"] > groups[key]["score"]:
            groups[key] = m
    return list(groups.values())

# =============================================
# 🧩 CONTEXT BUILDER
# =============================================
def build_context_blocks(matches: List[Dict[str, Any]]) -> str:
    """
    Builds a compact, readable context with small headers and snippets.
    Truncates to MAX_CHARS_CONTEXT.
    """
    lines = []
    for m in matches:
        meta = m["metadata"]
        title = smart_title(meta)
        link = meta.get("link") or meta.get("url") or ""
        ns = m["namespace"]
        # prefer 'chunk' or 'content' text
        text = meta.get("chunk") or meta.get("content") or meta.get("intro") or ""
        # light cleaning
        text = re.sub(r"\s+", " ", text).strip()
        snippet = text[:1200]  # keep each block brief

        header = f"[{ns}] {title}"
        if link:
            header += f" — {link}"
        lines.append(header)
        if meta.get("address") or meta.get("phone") or meta.get("email"):
            # For contact docs, include structured details first
            addr = meta.get("address", "")
            phone = meta.get("phone", "")
            email = meta.get("email", "")
            if addr: lines.append(f"Address: {addr}")
            if phone: lines.append(f"Phone: {phone}")
            if email: lines.append(f"Email: {email}")
        if snippet:
            lines.append(snippet)
        lines.append("-" * 8)

    context = "\n".join(lines)
    if len(context) > MAX_CHARS_CONTEXT:
        context = context[:MAX_CHARS_CONTEXT]
    return context

# =============================================
# 📇 CONTACT-MODE SHORTCUT (no LLM needed)
# =============================================
def try_contact_direct_answer(matches: List[Dict[str, Any]], user_query: str) -> str:
    """
    If router selected only fes_contact_details, build a direct answer from metadata.
    Returns empty string if not confident.
    """
    # Heuristic: if all matches are from contact namespace, assemble a concise answer.
    if not matches:
        return ""
    only_contact = all(m["namespace"] == "fes_contact_details" for m in matches)
    if not only_contact:
        return ""

    lines = ["Here are FES contact details that match your query:\n"]
    for m in matches[:5]:
        meta = m["metadata"]
        name = meta.get("branch_name") or "FES Office"
        addr = meta.get("address", "")
        phone = meta.get("phone", "")
        email = meta.get("email", "")
        link = meta.get("link", "")
        lines.append(f"• {name}")
        if addr:  lines.append(f"  📍 {addr}")
        if phone: lines.append(f"  📞 {phone}")
        if email: lines.append(f"  📧 {email}")
        if link:  lines.append(f"  🔗 {link}")
    return "\n".join(lines)

# =============================================
# 🗣️ ANSWER GENERATION (LLM)
# =============================================
SYSTEM_INSTRUCTIONS = """You are FES’s virtual counsellor.
Answer clearly and concisely using ONLY the provided context.
Prioritize FES sources (fes_blogs, fes_pages, fes_contact_details). You may use IDP (idp_blogs) to enrich neutral guidance, but never promote IDP; keep the advice centered on FES.
If the answer isn’t in the context, say you don’t have that information and suggest contacting FES (use contact details from context if present).
When relevant, mention the source title briefly in-line.
Be friendly, precise, and avoid speculation.
"""

def generate_answer(user_query: str, context_text: str) -> str:
    user_msg = f"User query:\n{user_query}\n\nContext:\n{context_text}"
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTIONS},
            {"role": "user", "content": user_msg},
        ],
    )
    return resp.choices[0].message.content.strip()

# =============================================
# 🚀 MAIN CHAT PIPELINE
# ===================================*==========
def rag_chat(user_query: str) -> str:
    # 1) Route
    route = classify_query(user_query)
    if not route:
        return "Sorry, I couldn’t route your query. Please rephrase."

    namespaces = [ns.strip() for ns in route.split("+") if ns.strip() in NAMESPACES]
    if not namespaces:
        return f"I couldn’t map the request to a known dataset. Router said: {route}"

    # 2) Retrieve
    qvec = embed_query(user_query)
    matches = pinecone_search(namespaces, qvec, top_k=TOP_K_PER_NS)
    if not matches:
        return "I couldn’t find relevant information in the knowledge base."

    # 3) Dedupe/merge
    matches = dedupe_by_page(matches)

    # 4) Contact-mode shortcut
    contact_answer = try_contact_direct_answer(matches, user_query)
    if contact_answer:
        return contact_answer

    # 5) Build context
    context = build_context_blocks(matches)

    # 6) Generate grounded answer
    answer = generate_answer(user_query, context)
    return answer

# =============================================
# 🧪 CLI TEST LOOP
# =============================================
if __name__ == "__main__":
    print("FES RAG Chatbot (no streaming). Type 'exit' to quit.\n")
    while True:
        q = input("You: ").strip()
        if not q:
            continue
        if q.lower() in {"exit", "quit"}:
            break
        try:
            reply = rag_chat(q)
            print("\nFES Bot:", reply, "\n" + "-"*60)
        except Exception as e:
            print(f"⚠️ Error: {e}\n" + "-"*60)

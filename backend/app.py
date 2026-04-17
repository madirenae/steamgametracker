from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        password TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY,
        username TEXT,
        content TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO users (username, password) VALUES (?, ?)",
              (data["username"], data["password"]))

    conn.commit()
    conn.close()

    return jsonify({"message": "User created"})

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE username=? AND password=?",
              (data["username"], data["password"]))

    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route("/save-notes", methods=["POST"])
def save_notes():
    data = request.json
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("DELETE FROM notes WHERE username=?", (data["username"],))
    c.execute("INSERT INTO notes (username, content) VALUES (?, ?)",
              (data["username"], data["notes"]))

    conn.commit()
    conn.close()

    return jsonify({"message": "Saved"})

@app.route("/get-notes/<username>")
def get_notes(username):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT content FROM notes WHERE username=?", (username,))
    result = c.fetchone()

    conn.close()

    return jsonify({"notes": result[0] if result else ""})

if __name__ == "__main__":
    app.run(debug=True)
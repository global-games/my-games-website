from flask import Flask, render_template, request, jsonify
from model import TextGenerator

app = Flask(__name__)
generator = TextGenerator()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/comingsoon")
def comingsoon():
    return render_template("comingsoon.html")

@app.route("/contests")
def contests():
    return render_template("contests.html")

@app.route("/textgenerator")
def textgenerator_page():
    return render_template("textgenerator.html")

@app.route("/generate", methods=["POST"])
def generate():
    prompt = request.form.get("prompt", "")
    if not prompt.strip():
        return jsonify({"error": "Bitte gib einen Text ein."})

    output = generator.generate(prompt)
    return jsonify({"text": output})

if __name__ == "__main__":
    app.run(debug=True)

from flask import Flask, render_template, request, jsonify
from model import TextGenerator

app = Flask(__name__)
generator = TextGenerator()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/contests")
def contests():
    return render_template("contests.html")

@app.route("/comingsoon")
def comingsoon():
    return render_template("comingsoon.html")

# 🔥 HIER kommt die neue Route hin
@app.route("/textgenerator")
def textgenerator_page():
    return render_template("textgenerator.html")

    output = generator.generate(prompt)
    return jsonify({"text": output})

if __name__ == "__main__":
    app.run(debug=True)

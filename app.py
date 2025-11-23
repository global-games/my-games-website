from flask import Flask, render_template, request, jsonify
from transformers import GPT2Tokenizer, GPT2LMHeadModel

app = Flask(__name__)

# Modell laden (z.B. nach dem Training aus Colab)
model = GPT2LMHeadModel.from_pretrained("my_model")
tokenizer = GPT2Tokenizer.from_pretrained("my_model")

@app.route("/textgenerator")
def textgenerator_page():
    return render_template("textgenerator.html")

@app.route("/generate", methods=["POST"])
def generate():
    prompt = request.form.get("prompt", "")
    if not prompt.strip():
        return jsonify({"error": "Bitte gib einen Text ein."})
    
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(**inputs, max_length=150)
    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return jsonify({"text": text})

if __name__ == "__main__":
    app.run(debug=True)

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

class TextGenerator:
    def __init__(self, model_name="gpt2"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)

    def generate(self, prompt, max_length=150):
        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        outputs = self.model.generate(
            **inputs,
            max_length=max_length,
            do_sample=True,
            top_p=0.9,
            top_k=50,
            temperature=0.8,
        )

        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

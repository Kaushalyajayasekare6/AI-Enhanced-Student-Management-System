import requests

try:
    r = requests.post('http://localhost:8003/predict', json={'english':47,'math':85,'sinhala':95,'tamil':50,'env':90,'attendance':75}, timeout=10)
    print(r.status_code)
    print(r.text)
except Exception as e:
    print('Error:', e)

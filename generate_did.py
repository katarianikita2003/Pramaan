import hashlib
import json
import os
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256

DID_STORAGE_FILE = "did_storage.json"
KEY_STORAGE_FILE = "keys.json"

def verify_proof(user_id, signature_hex):
    """Verify if the given proof (signature) is valid using the stored DID and Public Key."""
    # Load stored DIDs and Public Keys
    if not os.path.exists(DID_STORAGE_FILE) or not os.path.exists(KEY_STORAGE_FILE):
        print("DID or Key storage file not found!")
        return False

    with open(DID_STORAGE_FILE, "r") as file:
        did_data = json.load(file)

    with open(KEY_STORAGE_FILE, "r") as file:
        key_data = json.load(file)

    if user_id not in did_data or user_id not in key_data:
        print("User ID not found!")
        return False

    did = did_data[user_id]
    public_key = RSA.import_key(key_data[user_id])

    # Convert signature back to bytes
    signature = bytes.fromhex(signature_hex)

    # Verify the signature
    hash_obj = SHA256.new(did.encode())
    
    try:
        pkcs1_15.new(public_key).verify(hash_obj, signature)
        print("✅ Proof is VALID! The identity is verified.")
        return True
    except (ValueError, TypeError):
        print("❌ Proof is INVALID! The identity verification failed.")
        return False

# Example Usage
user_id = input("Enter your ID for verification: ")
signature_hex = input("Enter the received proof (Signature in hex format): ")

verify_proof(user_id, signature_hex)

import json

def convert_hex_to_int(hex_value):
    """Splits a 64-character hex string into two 128-bit decimal integers."""
    high_128 = int(hex_value[:32], 16)
    low_128 = int(hex_value[32:], 16)
    return high_128, low_128

# Load stored DIDs from did_storage.json
did_storage_file = "did_storage.json"

with open(did_storage_file, "r") as file:
    did_data = json.load(file)

# Convert each DID hash to two integers
converted_data = {}
for user_id, hashed_biometric in did_data.items():
    high, low = convert_hex_to_int(hashed_biometric)
    converted_data[user_id] = {"high": high, "low": low}

# Print converted values
for user, values in converted_data.items():
    print(f"User ID: {user}")
    print(f"  High: {values['high']}")
    print(f"  Low: {values['low']}")
    print("-")

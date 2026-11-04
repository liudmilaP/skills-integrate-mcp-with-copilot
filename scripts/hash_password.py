import getpass
import hashlib
import secrets


ITERATIONS = 600_000


def main():
    password = getpass.getpass("Teacher password: ")
    if not password:
        raise SystemExit("Password must not be empty.")

    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, ITERATIONS
    )
    print(f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${digest.hex()}")


if __name__ == "__main__":
    main()

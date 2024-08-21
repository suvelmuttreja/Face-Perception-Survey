from app import app, db, User, generate_password_hash
import sys

def add_user(username, password, is_admin=False):
    with app.app_context():
        if User.query.filter_by(username=username).first():
            print(f"User '{username}' already exists.")
            return

        new_user = User(username=username, password=generate_password_hash(password), is_admin=is_admin)
        db.session.add(new_user)
        db.session.commit()
        print(f"User '{username}' added successfully.")

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: python add_user.py <username> <password> <is_admin>")
    else:
        username = sys.argv[1]
        password = sys.argv[2]
        is_admin = sys.argv[3].lower() == 'true'
        add_user(username, password, is_admin)

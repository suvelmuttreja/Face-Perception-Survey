from app import app, db, Admin, generate_password_hash
import os

upload_folder = "uploads"
if not os.path.exists(upload_folder):
    os.makedirs(upload_folder)

with app.app_context():
    db.create_all()

    if not Admin.query.filter_by(username="admin").first():
        admin_user = Admin(username="admin", password=generate_password_hash("admin"))
        # regular_user = User(username='user', password=generate_password_hash('user'), is_admin=False)
        db.session.add(admin_user)
        # db.session.add(regular_user)
        db.session.commit()

    print("Database setup complete.")

from app import app, db, User, generate_password_hash
import os

upload_folder = 'uploads'
if not os.path.exists(upload_folder):
    os.makedirs(upload_folder)

with app.app_context():
    db.create_all()

    if not User.query.filter_by(username='admin').first():
        admin_user = User(username='admin', password=generate_password_hash('admin'), is_admin=True)
        regular_user = User(username='user', password=generate_password_hash('user'), is_admin=False)
        db.session.add(admin_user)
        db.session.add(regular_user)
        db.session.commit()

    print("Database setup complete.")

from flask import Flask, request, render_template, redirect, url_for, session, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///app.db')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', '6b8b4567327b23c664c16be0002f55f620fbd554c8f5f8f78c7dfd3e4a73ba65')
db = SQLAlchemy(app)

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    demographics = db.relationship('Demographics', backref='user', uselist=False)
    user_locations = db.relationship('UserLocation', backref='user')
    admin_locations = db.relationship('AdminLocation', backref='admin', uselist=False)

class Demographics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.String(120))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    education = db.Column(db.String(50))
    handedness = db.Column(db.String(10))
    ethnicity = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

class AdminLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    initial_x = db.Column(db.Float)
    initial_y = db.Column(db.Float)
    src = db.Column(db.String(200))
    question = db.Column(db.String(300))
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'))

class UserLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    final_x = db.Column(db.Float)
    final_y = db.Column(db.Float)
    src = db.Column(db.String(200))
    question = db.Column(db.String(300))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['is_admin'] = user.is_admin
            session['demographics_completed'] = bool(user.demographics)
            if user.is_admin:
                return redirect(url_for('admin'))
            else:
                return redirect(url_for('user'))
        else:
            return 'Invalid credentials'
    return render_template('login.html')

@app.route('/admin')
def admin():
    if 'is_admin' in session and session['is_admin']:
        return render_template('admin.html')
    return redirect(url_for('login'))

@app.route('/user')
def user():
    if 'user_id' in session:
        if not session.get('demographics_completed', False):
            return redirect(url_for('demographics'))
        return render_template('user.html')
    return redirect(url_for('login'))

@app.route('/demographics', methods=['GET', 'POST'])
def demographics():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        user_id = session['user_id']
        participant_id = request.form['participant_id']
        age = request.form['age']
        gender = request.form['gender']
        education = request.form['education']
        handedness = request.form['handedness']
        ethnicity = request.form['ethnicity']

        demographics = Demographics(
            participant_id=participant_id,
            age=age,
            gender=gender,
            education=education,
            handedness=handedness,
            ethnicity=ethnicity,
            user_id=user_id
        )
        db.session.add(demographics)
        db.session.commit()

        session['demographics_completed'] = True
        return redirect(url_for('user'))
    
    return render_template('demographics.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    files = request.files.getlist('files[]')
    if not files:
        return jsonify({'message': 'No files uploaded'}), 400

    file_names = []
    for file in files:
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        file_names.append(filename)

    print('Uploaded files:', file_names)  # Debugging line
    return jsonify({'message': 'Files uploaded successfully', 'files': file_names})


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/save_admin_locations', methods=['POST'])
def save_admin_locations():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))
    
    data = request.get_json()
    print('Received data:', data)  # Add this line to check received data
    admin_id = session['user_id']
    
    question = data.get('question')  # Get the question from the root level

    for loc in data['locations']:
        location = AdminLocation(
            initial_x=loc.get('initial_x'),
            initial_y=loc.get('initial_y'),
            src=loc.get('src'),
            question=question,  # Use the question from the root level
            admin_id=admin_id
        )
        db.session.add(location)
    db.session.commit()
    return jsonify({'message': 'Admin locations saved successfully'})

@app.route('/save_user_locations', methods=['POST'])
def save_user_locations():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    data = request.get_json()
    print('Received data:', data)
    user_id = session['user_id']
    
    question = data.get('question')

    for loc in data['locations']:
        location = UserLocation(
            final_x=loc.get('final_x'),
            final_y=loc.get('final_y'),
            src=loc['src'],
            question=question,
            user_id=user_id
        )
        db.session.add(location)
    db.session.commit()

    # Redirect to the end.html page after saving the data
    return redirect(url_for('end'))

@app.route('/end')
def end():
    return render_template('end.html')

@app.route('/load_admin_locations')
def load_admin_locations():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    if session.get('is_admin', False):
        locations = AdminLocation.query.filter_by(admin_id=user_id).all()
    else:
        locations = AdminLocation.query.all()

    loc_data = [{'initial_x': loc.initial_x, 'initial_y': loc.initial_y, 'src': loc.src, 'question': loc.question} for loc in locations]
    return jsonify({'locations': loc_data})

@app.route('/load_user_locations')
def load_user_locations():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    locations = UserLocation.query.filter_by(user_id=user_id).all()
    loc_data = [{'final_x': loc.final_x, 'final_y': loc.final_y, 'src': loc.src} for loc in locations]
    return jsonify({'locations': loc_data})

if __name__ == '__main__':
    app.run(debug=True)

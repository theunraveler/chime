import flask
import boto3
import dbm
import os
from enum import Enum
from pprint import pprint
from uuid import uuid4

app = flask.Flask(__name__)
chime = boto3.client('chime')
current_dir = os.path.dirname(os.path.realpath(__file__))

app.secret_key = '8611035ab47b897ebd329eb7e34a4099b3e0b2a3a1cf8201d14de495b92715a3'


@app.route('/', methods=['GET', 'POST'])
def index():
    with _db() as db:
        meetings = [room_id.decode() for room_id in db.keys()]
    return flask.render_template('index.html', meetings=meetings)


@app.route('/meetings', methods=['POST'])
def create_meeting():
    return flask.redirect(flask.url_for('meeting', room_id=uuid4()))


@app.route('/meetings/<room_id>')
def meeting(room_id):
    if 'username' not in flask.request.args:
        return flask.render_template('sign_in.html', room_id=room_id)

    meeting_response = chime.create_meeting(ClientRequestToken=room_id)
    with _db() as db:
        db[room_id] = meeting_response['Meeting']['MeetingId']
    attendee_response = chime.create_attendee(
        MeetingId=meeting_response['Meeting']['MeetingId'],
        ExternalUserId=flask.request.args['username'],
    )
    return flask.render_template('meeting.html', **{
        'room_id': room_id,
        'meeting_response': meeting_response,
        'attendee_response': attendee_response,
    })


@app.route('/meetings/<room_id>/delete', methods=['GET', 'POST'])
def delete_meeting(room_id):
    if flask.request.method == 'GET':
        return flask.render_template('delete.html', room_id=room_id)

    with _db() as db:
        meeting_id = db[room_id]
        chime.delete_meeting(MeetingId=meeting_id.decode())
        del db[room_id]
    
    flask.flash('The meeting %s has been deleted' % room_id)
    return flask.redirect(flask.url_for('index'))


def _db(**kwargs):
    return dbm.open(os.path.join(current_dir, 'meetings.db'), 'c', **kwargs)
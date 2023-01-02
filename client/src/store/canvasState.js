import { makeAutoObservable } from 'mobx';
import axios from 'axios';

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  undoList = [];
  redoList = [];
  username = '';

  constructor() {
    makeAutoObservable(this);
  }

  setSessionId(id) {
    this.sessionid = id;
  }
  setSocket(socket) {
    this.socket = socket;
  }

  setUsername(username) {
    this.username = username;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  pushToUndo(data) {
    this.undoList.push(data);
  }

  pushToRedo(data) {
    this.redoList.push(data);
  }
  clearRedo() {
    this.redoList.splice(0, this.redoList.length);
  }
  sendUndo(id) {
    const socketToSend = this.socket;
    socketToSend.send(
      JSON.stringify({
        method: 'undo',
        id: this.sessionid,
        figure: this.undoList[this.undoList.length - 1],
      })
    );
    if (this.canvas.toDataURL()&& id) {
      axios
        .post(`http://localhost:5000/image?id=${id}`, {
          img: this.canvas.toDataURL(),
        })
        .then((response) => console.log(response.data));
    }
  }
  sendRedo(id) {
    const socketToSend = this.socket;
    socketToSend.send(
      JSON.stringify({
        id: this.sessionid,
        method: 'redo',
        figure: {},
      })
    );
    if (this.canvas.toDataURL()&&id) {
    axios
      .post(`http://localhost:5000/image?id=${id}`, {
        img: this.canvas.toDataURL(),
      })
      .then((response) => console.log(response.data));}
  }
  undo() {
    let ctx = this.canvas.getContext('2d');
    if (this.undoList.length > 0) {
      let dataUrl = this.undoList.pop();
      this.redoList.push(this.canvas.toDataURL());
      let img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };
    } else {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.heigth);
    }
  }

  redo() {
    let ctx = this.canvas.getContext('2d');
    if (this.redoList.length > 0) {
      let dataUrl = this.redoList.pop();
      this.undoList.push(this.canvas.toDataURL());
      let img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };
    }
  }
}

export default new CanvasState();

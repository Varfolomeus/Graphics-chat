import React, { useEffect, useRef, useState } from 'react';
import '../styles/canvas.scss';
import { observer } from 'mobx-react-lite';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';
import { Modal, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import Rect from '../tools/Rect';
import axios from 'axios';
import Circle from '../tools/Circle';
import Eraser from '../tools/Eraser';
import Line from '../tools/Line';

const Canvas = observer(() => {
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(true);
  const params = useParams();

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    let ctx = canvasRef.current.getContext('2d');
    axios
      .get(`http://localhost:5000/image?id=${params.id}`)
      .then((response) => {
        const img = new Image();
        img.src = response.data;
        // console.log('img', img);
        img.onload = () => {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          ctx.drawImage(
            img,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          canvasState.undoList.push(img.src);
        };
      });
  }, []);

  useEffect(() => {
    if (canvasState.username) {
      const socket = new WebSocket(`ws://localhost:5000/`);
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);
      toolState.setTool(new Brush(canvasRef.current, socket, params.id));
      socket.onopen = () => {
        console.log('Подключение установлено');
        socket.send(
          JSON.stringify({
            id: params.id,
            username: canvasState.username,
            method: 'connection',
          })
        );
      };
      socket.onmessage = (event) => {
        let msg = JSON.parse(event.data);
        switch (msg.method) {
          case 'connection':
            console.log(`пользователь ${msg.username} присоединился`);
            break;
          case 'draw':

            drawHandler(msg);
            if (
              msg.figure.type === 'rect' ||
              msg.figure.type === 'circle' ||
              msg.figure.type === 'line'
            ) {
              drawHandler({
                method: 'draw',
                id: params.id,
                figure: {
                  type: 'finish',
                },
              });
            }
            canvasState.clearRedo();
            break;
          case 'undo':
            undoHandler(msg);
            // console.log('undo request');
            break;
          case 'redo':
            // console.log('redo request');

            if (canvasState.redoList.length > 0) {
              canvasState.redo(params.id);
            }

            break;
        }
      };
    }
  }, [canvasState.username]);

  const undoHandler = (msg) => {
    if (canvasState.undoList.length > 0) {
      canvasState.undo(msg.id);
    } else {
      canvasState.undoList.push(msg.figure);
      canvasState.undo(msg.id);
    }
  };

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext('2d');
    switch (figure.type) {
      case 'brush':
        Brush.draw(
          ctx,
          figure.x,
          figure.y,
          figure.lineWidth,
          figure.strokeColor
        );
        break;
      case 'line':
        Line.staticDraw(
          ctx,
          figure.startX,
          figure.starty,
          figure.finX,
          figure.finY,
          figure.lineWidth,
          figure.strokeColor
        );

        break;
      case 'eraser':
        Eraser.draw(ctx, figure.x, figure.y, figure.lineWidth, 'white');
        break;
      case 'rect':
        Rect.staticDraw(
          ctx,
          figure.x,
          figure.y,
          figure.width,
          figure.height,
          figure.color,
          figure.color1,
          figure.lineWidth
        );
        break;

      case 'circle':
        Circle.staticDraw(
          ctx,
          figure.x,
          figure.y,
          figure.radius,
          figure.color,
          figure.color1,
          figure.lineWidth
        );
        break;
      case 'finish':
        ctx.beginPath();
        const imgToTransfer = canvasRef.current.toDataURL();
        canvasState.pushToUndo(imgToTransfer);
        break;
    }
  };

  const mouseDownHandler = () => {
    const imgToTransfer = canvasRef.current.toDataURL();
    axios
      .post(`http://localhost:5000/image?id=${params.id}`, {
        img: imgToTransfer,
      })
      .then((response) => console.log(response.data));
  };

  const connectHandler = () => {
    canvasState.setUsername(usernameRef.current.value);
    setModal(false);
  };

  return (
    <div className="canvas">
      <Modal show={modal} onHide={() => {}}>
        <Modal.Header>
          <Modal.Title>Введите ваше имя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input type="text" ref={usernameRef} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => connectHandler()}>
            Войти
          </Button>
        </Modal.Footer>
      </Modal>
      <canvas
        onMouseDown={() => mouseDownHandler()}
        ref={canvasRef}
        width={600}
        height={400}
      />
    </div>
  );
});

export default Canvas;

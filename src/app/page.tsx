"use client";
import React, { useState, useCallback, useMemo } from "react";
import styles from "./page.module.css";

const BASE_URL = "http://10.10.1.124:8000";
// const BASE_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [images, setImages] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<string[]>([]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setImages((prevImages) => [...prevImages, ...files]);
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const processed = await Promise.all(
        images.map(async (image) => {
          const formData = new FormData();
          formData.append("file", image, image.name);
          console.log(image.type);
          const response = await fetch(`${BASE_URL}/predict/`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          console.log(data);
          return drawBoundingBoxes(image, data.predictions);
        })
      )
      setProcessedImages(processed);
    } catch (error) {
      console.error("Error processing images:", error);
    }
  }, [images]);

  const drawBoundingBoxes = async (image: File, predictions: any[]) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes
            predictions.forEach((predictionGroup) => {
              predictionGroup.forEach((prediction: { box: { x1: any; y1: any; x2: any; y2: any; }; }) => {
                const { x1, y1, x2, y2 } = prediction.box;
                ctx.strokeStyle = "red";
                ctx.lineWidth = 2;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
              });
            });

            resolve(canvas.toDataURL());
          } else {
            reject(new Error("Canvas context is not available"));
          }
        };
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(image);
    });
  };

  const imagePreviews = useMemo(
    () =>
      images.map((image, index) => (
        <div key={index} className={styles.preview}>
          <img
            src={URL.createObjectURL(image)}
            alt={`Preview ${index}`}
            className={styles.previewImage}
          />
          <button
            className={styles.removeButton}
            onClick={() => handleRemoveImage(index)}
          >
            X
          </button>
        </div>
      )),
    [images, handleRemoveImage]
  );

  const processedImagePreviews = useMemo(
    () =>
      processedImages.map((image, index) => (
        <div key={index} className={styles.preview}>
          <img
            src={image}
            alt={`Processed ${index}`}
            className={styles.previewImage}
          />
        </div>
      )),
    [processedImages]
  );

  return (
    <main className={styles.main}>
      <div
        className={styles.dropzone}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p>Drag and drop images here</p>
        {imagePreviews}
      </div>

      <button onClick={handleSubmit} className={styles.submitButton}>
        Submit
      </button>

      <div className={styles.resultZone}>
        <h2>Processed Images</h2>
        {processedImagePreviews}
      </div>
    </main>
  );
}

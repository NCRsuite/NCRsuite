const MAX_SOURCE_SIZE = 25 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 8 * 1024 * 1024;
const MAX_DIMENSION = 2400;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Ce format photo ne peut pas être lu sur cet appareil.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('La photo n’a pas pu être préparée.'));
    }, 'image/jpeg', quality);
  });
}

export async function prepareCleaningPhoto(file: File, kind: 'before' | 'after') {
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('La photo est trop volumineuse. Prends une nouvelle photo plus légère.');
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error('La photo sélectionnée est vide ou illisible.');

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('La photo ne peut pas être préparée sur cet appareil.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToBlob(canvas, 0.86);
  if (blob.size > MAX_OUTPUT_SIZE) blob = await canvasToBlob(canvas, 0.7);
  if (blob.size > MAX_OUTPUT_SIZE) {
    throw new Error('La photo reste trop volumineuse après optimisation. Prends-la avec une définition plus faible.');
  }

  return new File([blob], `${kind}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
}

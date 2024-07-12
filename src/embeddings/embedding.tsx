import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Text,
  Image as Img,
  Heading,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function Embedding() {
  const [isFileLoaded, setIsFileLoaded] = useState<boolean>(false);
  const [finalText, setFinalText] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    console.log(finalText);
  }, [finalText]);

  const preprocessImage = async (imageDataURL: string): Promise<string> => {
    return new Promise((resolve) => {
      const preprocessWorker = new Worker(
        new URL("./preprocess.worker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      const img = new Image();
      img.src = imageDataURL;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = img.width;
        canvas.height = img.height;

        // Desenhar a imagem no canvas
        ctx.drawImage(img, 0, 0);

        // Converter para escala de cinza
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }

        ctx.putImageData(imageData, 0, 0);

        // Binarização adaptativa

        const blockSize = 8; // Tamanho da vizinhança para cálculo local
        const C = 10; // Valor de compensação para o limiar

        preprocessWorker.postMessage({
          blockSize: blockSize,
          C: C,
          data: data,
          width: canvas.width,
          height: canvas.height,
        });

        preprocessWorker.onmessage = (event) => {
          ctx.putImageData(imageData, 0, 0);

          imageData.data.set(event.data);

          resolve(canvas.toDataURL("image/png"));
        };
      };
    });
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileTemp: File | undefined = event.target.files?.[0];
    
    setImages([]);

    if (fileTemp) {
      const initialTime = new Date();
      const buffer = await fileTemp.arrayBuffer();

      const pdf = await pdfjs.getDocument(buffer).promise;
      const pagesQuantity = pdf.numPages;
      const pdfTextForPage: string[] = [];

      const worker = new Worker(
        new URL("./embedding.worker.ts", import.meta.url),
        {
          type: "module",
        }
      );

      worker.onmessage = (event) => {
        const { pageNumber, text } = event.data;
        pdfTextForPage[pageNumber - 1] = text;

        if (pdfTextForPage.length === pagesQuantity) {
          setFinalText(pdfTextForPage);

          const finalTime = new Date().getTime() - initialTime.getTime();
          console.log("Time to complete the processing:", finalTime);

          setIsFileLoaded(true);
          worker.terminate();
        }
      };

      for (let pageNumber = 1; pageNumber <= pagesQuantity; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        let textPerPage = "";

        if (textContent.items.length > 0) {
          console.log(`Processing PDF Page ${pageNumber}...`);
          textContent.items.forEach((item: any) => {
            textPerPage += item.str + " ";
          });

          pdfTextForPage[pageNumber - 1] = textPerPage;

          if (pageNumber === pagesQuantity) {
            setFinalText(pdfTextForPage);
          }
        } else {
          console.log(`Rendering PDF Page ${pageNumber}...`);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const renderContext = {
            canvasContext: context!,
            viewport: viewport,
          };

          await page.render(renderContext).promise;

          const imageDataURL = canvas.toDataURL("image/png");
          const preprocessedImageDataURL = await preprocessImage(imageDataURL);

          setImages((prevImages) => [...prevImages, preprocessedImageDataURL]);

          worker.postMessage({
            imageDataURL: preprocessedImageDataURL,
            pageNumber: pageNumber,
          });
        }
      }
    }
  };

  const handleSubmit = () => {
    // Implementar lógica de envio, se necessário
  };

  return (
    <Flex justify="center" align="center" w="100vw" minH="100vh">
      <Flex direction="column">
        <Flex direction="column" fontSize="16px" m="30px">
          <Heading p='16px' borderBottom='1px solid white'>TEXTO EXTRAÍDO</Heading>
          {finalText.map((text, i) => {
            return (
              <Text key={i} m="16px">
                {text}
              </Text>
            );
          })}
        </Flex>
        <Heading p='16px' borderBottom='1px solid white'>IMAGENS EXTRAÍDAS JÁ PRÉ PROCESSADAS</Heading>
        {images.map((img, index) => (
          <Img key={index} m="10px" src={img}></Img>
        ))}
        <Flex>
          <FormControl>
            <FormLabel>INSERIR ARQUIVO: </FormLabel>
            <Input type="file" onChange={handleFileChange} />
            <Button
              mt={4}
              colorScheme="teal"
              onClick={handleSubmit}
              isDisabled={!isFileLoaded}
            >
              ENVIAR
            </Button>
          </FormControl>
        </Flex>
      </Flex>
    </Flex>
  );
}

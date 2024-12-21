import "./style.css";
import {
  DRACOLoader,
  GLTFLoader,
  OrbitControls,
} from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import { unzipSync } from "three/examples/jsm/libs/fflate.module.js";
import { OBJMTLExporter } from "./OBJExporter";
export class Experience {
  private _canvas: HTMLCanvasElement;

  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _renderer: THREE.WebGLRenderer;
  private _controls: OrbitControls;
  private _size: { width: number; height: number } | null = null;
  constructor(
    canvas: HTMLCanvasElement,
    size?: { width: number; height: number }
  ) {
    this._canvas = canvas;
    if (size) {
      this._size = size;
    }
    this._camera = new THREE.PerspectiveCamera(
      25,
      this._size
        ? this._size.width / this._size.height
        : window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this._camera.position.set(0, 0, 10);

    this._scene = new THREE.Scene();

    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this._canvas,
    });
    this._renderer.setPixelRatio(window.devicePixelRatio);

    if (this._size) {
      this._renderer.setSize(this._size.width, this._size.height);
    } else {
      this._renderer.setSize(window.innerWidth, window.innerHeight);
    }

    this._renderer.setAnimationLoop(this.animate);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.minDistance = 0.1;
    this._controls.maxDistance = 50;
    this._controls.target.y = 0;
    this._controls.target.z = 0;
    this._controls.target.x = 0;

    window.addEventListener("resize", this.onWindowResize);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 5, 5);
    this._scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-5, 5, 0);
    this._scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight3.position.set(5, 5, 0);
    this._scene.add(directionalLight3);

    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight4.position.set(0, 5, -5);
    this._scene.add(directionalLight4);

    //default box
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this._scene.add(cube);
  }

  private onWindowResize = () => {
    if (this._size) {
      this._camera.aspect = this._size.width / this._size.height;
    } else {
      this._camera.aspect = window.innerWidth / window.innerHeight;
    }
    this._camera.updateProjectionMatrix();
    if (this._size) {
      this._renderer.setSize(this._size.width, this._size.height);
    } else {
      this._renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  private animate = () => {
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  };
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

if (!canvas) {
  throw new Error("Canvas not found");
}

new Experience(canvas);

const input = document.getElementById("fileInput") as HTMLInputElement;
if (!input) {
  throw new Error("Input not found");
}
input.style.pointerEvents = "all";

type ZipFolderType = { [key: string]: Uint8Array };

const extractZipFolder = (content: Uint8Array) => {
  const globalZipFolder: ZipFolderType = {};
  const extractZipFile = (content: Uint8Array, basePath: string = "") => {
    const zip = unzipSync(content);

    const fileNames = Object.keys(zip);
    fileNames.forEach((fileName) => {
      const file = zip[fileName];
      const extension = fileName.split(".").pop()?.toLocaleLowerCase();
      if (extension === "zip") {
        const folderPath = fileName.split("/").slice(0, -1).join("/");
        extractZipFile(file, `${folderPath}/`);
      } else {
        globalZipFolder[basePath + fileName] = file;
      }
    });

    return globalZipFolder;
  };
  return extractZipFile(content);
};

function getImageMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    jpg: "image/jpg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    tiff: "image/tiff",
    tif: "image/tiff",
    ico: "image/vnd.microsoft.icon",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}

function createGLTFLoader(manager?: THREE.LoadingManager) {
  const loader = new GLTFLoader(manager);
  const dracoLoader = new DRACOLoader(manager);
  dracoLoader.setDecoderConfig({ type: "js" });
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);
  return loader;
}

input.addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) {
    console.error("No file selected");
    return;
  }
  const fileName = file.name;
  const fileExtension = fileName.split(".").pop()?.toLowerCase();

  const fileReader = new FileReader();
  fileReader.onload = (e) => {
    const buffer = e.target?.result;
    if (buffer) {
      if (fileExtension === "zip") {
        const content = buffer as ArrayBuffer;

        const fileContent = new Uint8Array(content);

        const zipFolder = extractZipFolder(fileContent);

        console.log(zipFolder);

        const manager = new THREE.LoadingManager();

        const files = Object.keys(zipFolder);

        manager.setURLModifier(function (url) {
          let file = zipFolder[url];

          if (!file) {
            const fileName = url.split("/").pop();
            if (fileName) {
              // Try to find the file by matching the file name if the URL doesn't match exactly
              const matchingKey = files.find((key) =>
                key.toLowerCase().endsWith(fileName.toLowerCase())
              );
              if (matchingKey) {
                file = zipFolder[matchingKey];
              }
            }
          }

          if (file) {
            const ext = url.split(".").pop()?.toLowerCase();

            const blob = new Blob([file.buffer], {
              type: ext ? getImageMimeType(ext) : "application/octet-stream",
            });

            return URL.createObjectURL(blob);
          }

          return url;
        });
      } else if (fileExtension === "glb") {
        const loader = createGLTFLoader();
        loader.parse(
          buffer,
          "",
          async function (result) {
            const scene = result.scene;
            const zip = await new OBJMTLExporter().exportToZip(scene);
            const mimeType = "application/zip";
            const convertedFileName = `${fileName
              .replace(".", "")
              .replace(fileExtension, "")}.zip`;

            const link = document.createElement("a");

            const blob = new Blob([zip], { type: mimeType });
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = convertedFileName;
            document.body.appendChild(link);
            link.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(link);
          },
          (err) => {
            throw new Error("Error loading GLTF file");
          }
        );
      }
    }
  };
  fileReader.onerror = (e) => {
    console.error(e);
  };
  fileReader.readAsArrayBuffer(file);
});

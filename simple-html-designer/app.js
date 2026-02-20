class DesignerApp {
  constructor(options = {}) {
    const { canvasId = "designer-canvas" } = options;

    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element not found: #${canvasId}`);
    }

    this.elements = [];
    this.selectedElementId = null;
    this.elementCounter = 0;
    this.spawnOffset = 0;
    this.controlsPanel = document.getElementById("controls-panel");

    this.initializeCanvas();
    this.initializeControls();
    this.bindCanvasEvents();
  }

  // Ensure the canvas can host absolutely positioned layout elements.
  initializeCanvas() {
    if (!this.canvas.style.position) {
      this.canvas.style.position = "relative";
    }
    if (!this.canvas.style.minHeight) {
      this.canvas.style.minHeight = "400px";
    }
  }

  getNextElementId() {
    this.elementCounter += 1;
    return `layout-element-${this.elementCounter}`;
  }

  getNextPosition() {
    const base = 24;
    const step = 20;
    const position = {
      x: base + this.spawnOffset,
      y: base + this.spawnOffset,
    };

    this.spawnOffset = (this.spawnOffset + step) % 120;
    return position;
  }

  initializeControls() {
    if (!this.controlsPanel) {
      return;
    }

    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "controls-actions";
    controlsWrapper.style.display = "grid";
    controlsWrapper.style.gap = "8px";

    const createBoxButton = this.createControlButton("Add Box", () => {
      this.createBox();
    });
    const createTextButton = this.createControlButton("Add Text", () => {
      this.createText();
    });
    const createImageButton = this.createControlButton("Add Image", () => {
      this.createImage();
    });
    const deleteButton = this.createControlButton("Delete Selected", () => {
      this.deleteElement();
    });

    controlsWrapper.appendChild(createBoxButton);
    controlsWrapper.appendChild(createTextButton);
    controlsWrapper.appendChild(createImageButton);
    controlsWrapper.appendChild(deleteButton);
    this.controlsPanel.appendChild(controlsWrapper);
  }

  createControlButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  createBox() {
    const { x, y } = this.getNextPosition();
    return this.createElement({
      type: "box",
      x,
      y,
      width: 160,
      height: 100,
      content: "",
    });
  }

  createText(content = "Sample text") {
    const { x, y } = this.getNextPosition();
    return this.createElement({
      type: "text",
      x,
      y,
      width: 200,
      height: 60,
      content,
    });
  }

  createImage(content = "Image placeholder") {
    const { x, y } = this.getNextPosition();
    return this.createElement({
      type: "image",
      x,
      y,
      width: 220,
      height: 140,
      content,
    });
  }

  createElement({ type, x, y, width, height, content }) {
    const id = this.getNextElementId();
    const elementData = {
      id,
      type,
      x,
      y,
      width,
      height,
      content,
    };

    const elementNode = document.createElement("div");
    elementNode.id = id;
    elementNode.className = "layout-element";
    elementNode.style.position = "absolute";
    elementNode.style.left = `${x}px`;
    elementNode.style.top = `${y}px`;
    elementNode.style.width = `${width}px`;
    elementNode.style.height = `${height}px`;
    elementNode.style.boxSizing = "border-box";
    elementNode.style.border = "1px solid #9ca3af";
    elementNode.style.background = "#ffffff";
    elementNode.style.cursor = "pointer";

    if (type === "text") {
      elementNode.textContent = content;
      elementNode.style.padding = "8px";
      elementNode.style.display = "flex";
      elementNode.style.alignItems = "center";
    } else if (type === "image") {
      elementNode.textContent = content;
      elementNode.style.display = "flex";
      elementNode.style.alignItems = "center";
      elementNode.style.justifyContent = "center";
      elementNode.style.background = "#e5e7eb";
      elementNode.style.color = "#374151";
      elementNode.style.fontSize = "12px";
    }

    elementNode.addEventListener("click", (event) => {
      event.stopPropagation();
      this.selectElement(id);
    });

    this.canvas.appendChild(elementNode);
    this.elements.push(elementData);
    this.selectElement(id);

    return elementData;
  }

  selectElement(elementId = null) {
    const previousSelection = this.getElementNode(this.selectedElementId);
    if (previousSelection) {
      previousSelection.classList.remove("is-selected");
      previousSelection.style.outline = "none";
      previousSelection.style.outlineOffset = "0";
    }

    if (!elementId) {
      this.selectedElementId = null;
      return null;
    }

    const exists = this.elements.some((item) => item.id === elementId);
    if (!exists) {
      this.selectedElementId = null;
      return null;
    }

    const selectionNode = this.getElementNode(elementId);
    if (selectionNode) {
      selectionNode.classList.add("is-selected");
      selectionNode.style.outline = "2px solid #2563eb";
      selectionNode.style.outlineOffset = "1px";
    }

    this.selectedElementId = elementId;
    return elementId;
  }

  deleteElement() {
    if (!this.selectedElementId) {
      return false;
    }

    const idToDelete = this.selectedElementId;
    this.elements = this.elements.filter((item) => item.id !== idToDelete);

    const elementNode = this.getElementNode(idToDelete);
    if (elementNode) {
      elementNode.remove();
    }

    this.selectedElementId = null;
    return true;
  }

  bindCanvasEvents() {
    this.canvas.addEventListener("click", (event) => {
      if (event.target === this.canvas) {
        this.selectElement(null);
      }
    });
  }

  getElementNode(elementId) {
    if (!elementId) {
      return null;
    }
    return document.getElementById(elementId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new DesignerApp();
  window.designerApp = app;
});

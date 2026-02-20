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
    this.minElementSize = 50;
    this.activeInteraction = null;
    this.resizeDirections = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
    this.controlsPanel = document.getElementById("controls-panel");
    this.exportButton = null;
    this.exportStatusNode = null;
    this.exportButtonLabel = "Export as PNG";
    this.isExporting = false;

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
    if (!this.canvas.style.overflow) {
      this.canvas.style.overflow = "hidden";
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
    const exportButton = this.createControlButton(this.exportButtonLabel, () => {
      this.exportAsPng();
    });
    const exportStatus = document.createElement("p");
    exportStatus.className = "export-status";
    exportStatus.setAttribute("aria-live", "polite");
    exportStatus.hidden = true;

    controlsWrapper.appendChild(createBoxButton);
    controlsWrapper.appendChild(createTextButton);
    controlsWrapper.appendChild(createImageButton);
    controlsWrapper.appendChild(deleteButton);
    controlsWrapper.appendChild(exportButton);
    controlsWrapper.appendChild(exportStatus);
    this.controlsPanel.appendChild(controlsWrapper);
    this.exportButton = exportButton;
    this.exportStatusNode = exportStatus;
  }

  createControlButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  async exportAsPng() {
    if (this.isExporting) {
      return;
    }

    if (typeof window.html2canvas !== "function") {
      this.showExportStatus(
        "Export is unavailable right now. Please refresh and try again.",
        "error"
      );
      return;
    }

    this.isExporting = true;
    this.setExportLoadingState(true);
    this.showExportStatus("Exporting PNG...", "info");

    const previousSelectionId = this.selectedElementId;

    try {
      if (this.activeInteraction) {
        this.endInteraction();
      }

      this.selectElement(null);
      await this.nextAnimationFrame();

      const { width, height } = this.getCanvasSize();
      const renderedCanvas = await window.html2canvas(this.canvas, {
        scale: 1,
        width,
        height,
      });
      const pngDataUrl = renderedCanvas.toDataURL("image/png");
      const filename = this.getExportFilename();
      this.triggerDownload(pngDataUrl, filename);
      this.showExportStatus(`PNG downloaded as ${filename}`, "success");
    } catch (error) {
      // Keep console details for debugging while showing a user-friendly message.
      console.error("PNG export failed:", error);
      this.showExportStatus("Unable to export PNG. Please try again.", "error");
    } finally {
      this.selectElement(previousSelectionId);
      this.setExportLoadingState(false);
      this.isExporting = false;
    }
  }

  setExportLoadingState(isLoading) {
    if (!this.exportButton) {
      return;
    }
    this.exportButton.disabled = isLoading;
    this.exportButton.textContent = isLoading
      ? "Exporting..."
      : this.exportButtonLabel;
  }

  showExportStatus(message, state) {
    if (!this.exportStatusNode) {
      return;
    }

    this.exportStatusNode.textContent = message;
    this.exportStatusNode.dataset.state = state || "";
    this.exportStatusNode.hidden = !message;
  }

  getExportFilename(now = new Date()) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `layout-${year}-${month}-${day}-${hours}${minutes}${seconds}.png`;
  }

  triggerDownload(dataUrl, filename) {
    const downloadLink = document.createElement("a");
    downloadLink.href = dataUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }

  nextAnimationFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
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
    const normalizedWidth = Math.max(width, this.minElementSize);
    const normalizedHeight = Math.max(height, this.minElementSize);
    const normalizedPosition = this.getBoundedPosition(
      x,
      y,
      normalizedWidth,
      normalizedHeight
    );
    const id = this.getNextElementId();
    const elementData = {
      id,
      type,
      x: normalizedPosition.x,
      y: normalizedPosition.y,
      width: normalizedWidth,
      height: normalizedHeight,
      content,
    };

    const elementNode = document.createElement("div");
    elementNode.id = id;
    elementNode.className = "layout-element";
    elementNode.style.position = "absolute";
    elementNode.style.boxSizing = "border-box";
    elementNode.style.border = "1px solid #9ca3af";
    elementNode.style.background = "#ffffff";
    elementNode.style.cursor = "pointer";
    elementNode.style.overflow = "visible";

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

    this.applyElementLayout(elementNode, elementData);
    this.addResizeHandles(elementNode);

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
    if (this.activeInteraction && this.activeInteraction.elementId === idToDelete) {
      this.endInteraction();
    }

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

    this.canvas.addEventListener("mousedown", (event) => {
      this.handleCanvasMouseDown(event);
    });

    document.addEventListener("mousemove", (event) => {
      this.handleDocumentMouseMove(event);
    });

    document.addEventListener("mouseup", () => {
      this.handleDocumentMouseUp();
    });
  }

  getElementNode(elementId) {
    if (!elementId) {
      return null;
    }
    return document.getElementById(elementId);
  }

  getElementData(elementId) {
    if (!elementId) {
      return null;
    }
    return this.elements.find((item) => item.id === elementId) ?? null;
  }

  getCanvasSize() {
    return {
      width: this.canvas.clientWidth || this.canvas.offsetWidth || 0,
      height: this.canvas.clientHeight || this.canvas.offsetHeight || 0,
    };
  }

  getBoundedPosition(x, y, width, height) {
    const { width: canvasWidth, height: canvasHeight } = this.getCanvasSize();
    const maxX = Math.max(0, canvasWidth - width);
    const maxY = Math.max(0, canvasHeight - height);

    return {
      x: this.clamp(x, 0, maxX),
      y: this.clamp(y, 0, maxY),
    };
  }

  applyElementLayout(elementNode, elementData) {
    elementNode.style.left = `${elementData.x}px`;
    elementNode.style.top = `${elementData.y}px`;
    elementNode.style.width = `${elementData.width}px`;
    elementNode.style.height = `${elementData.height}px`;
  }

  addResizeHandles(elementNode) {
    this.resizeDirections.forEach((direction) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle resize-handle--${direction}`;
      handle.dataset.direction = direction;
      elementNode.appendChild(handle);
    });
  }

  handleCanvasMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    const handleNode = event.target.closest(".resize-handle");
    if (handleNode && this.canvas.contains(handleNode)) {
      const elementNode = handleNode.closest(".layout-element");
      if (!elementNode) {
        return;
      }

      this.selectElement(elementNode.id);
      this.startResizeInteraction(elementNode.id, handleNode.dataset.direction, event);
      return;
    }

    const elementNode = event.target.closest(".layout-element");
    if (elementNode && this.canvas.contains(elementNode)) {
      this.selectElement(elementNode.id);
      this.startDragInteraction(elementNode.id, event);
      return;
    }
  }

  startDragInteraction(elementId, event) {
    const elementData = this.getElementData(elementId);
    const elementNode = this.getElementNode(elementId);
    if (!elementData || !elementNode) {
      return;
    }

    const canvasSize = this.getCanvasSize();
    this.activeInteraction = {
      type: "drag",
      elementId,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: elementData.x,
      startY: elementData.y,
      width: elementData.width,
      height: elementData.height,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    };

    elementNode.classList.add("is-dragging");
    this.canvas.classList.add("is-dragging");
    this.beginInteraction("grabbing");
    event.preventDefault();
  }

  startResizeInteraction(elementId, direction, event) {
    const elementData = this.getElementData(elementId);
    const elementNode = this.getElementNode(elementId);
    if (!elementData || !elementNode || !direction) {
      return;
    }

    const canvasSize = this.getCanvasSize();
    this.activeInteraction = {
      type: "resize",
      elementId,
      direction,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: elementData.x,
      startY: elementData.y,
      startWidth: elementData.width,
      startHeight: elementData.height,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    };

    elementNode.classList.add("is-resizing");
    this.canvas.classList.add("is-resizing");
    this.beginInteraction(this.getResizeCursor(direction));
    event.preventDefault();
    event.stopPropagation();
  }

  beginInteraction(cursor) {
    document.body.classList.add("designer-no-select");
    document.body.style.cursor = cursor;
  }

  endInteraction() {
    if (!this.activeInteraction) {
      return;
    }

    const activeElementNode = this.getElementNode(this.activeInteraction.elementId);
    if (activeElementNode) {
      activeElementNode.classList.remove("is-dragging");
      activeElementNode.classList.remove("is-resizing");
    }

    this.canvas.classList.remove("is-dragging");
    this.canvas.classList.remove("is-resizing");
    this.activeInteraction = null;
    document.body.classList.remove("designer-no-select");
    document.body.style.cursor = "";
  }

  handleDocumentMouseMove(event) {
    if (!this.activeInteraction) {
      return;
    }

    if (this.activeInteraction.type === "drag") {
      this.updateDragInteraction(event);
    } else if (this.activeInteraction.type === "resize") {
      this.updateResizeInteraction(event);
    }

    event.preventDefault();
  }

  handleDocumentMouseUp() {
    if (!this.activeInteraction) {
      return;
    }
    this.endInteraction();
  }

  updateDragInteraction(event) {
    const interaction = this.activeInteraction;
    const elementData = this.getElementData(interaction.elementId);
    const elementNode = this.getElementNode(interaction.elementId);
    if (!elementData || !elementNode) {
      this.endInteraction();
      return;
    }

    const deltaX = event.clientX - interaction.startMouseX;
    const deltaY = event.clientY - interaction.startMouseY;
    const maxX = Math.max(0, interaction.canvasWidth - interaction.width);
    const maxY = Math.max(0, interaction.canvasHeight - interaction.height);
    const x = this.clamp(interaction.startX + deltaX, 0, maxX);
    const y = this.clamp(interaction.startY + deltaY, 0, maxY);

    if (x === elementData.x && y === elementData.y) {
      return;
    }

    elementData.x = x;
    elementData.y = y;
    this.applyElementLayout(elementNode, elementData);
  }

  updateResizeInteraction(event) {
    const interaction = this.activeInteraction;
    const elementData = this.getElementData(interaction.elementId);
    const elementNode = this.getElementNode(interaction.elementId);
    if (!elementData || !elementNode) {
      this.endInteraction();
      return;
    }

    const deltaX = event.clientX - interaction.startMouseX;
    const deltaY = event.clientY - interaction.startMouseY;
    const direction = interaction.direction;
    let x = interaction.startX;
    let y = interaction.startY;
    let width = interaction.startWidth;
    let height = interaction.startHeight;

    if (direction.includes("e")) {
      const maxWidth = Math.max(
        this.minElementSize,
        interaction.canvasWidth - interaction.startX
      );
      width = this.clamp(
        interaction.startWidth + deltaX,
        this.minElementSize,
        maxWidth
      );
    }

    if (direction.includes("s")) {
      const maxHeight = Math.max(
        this.minElementSize,
        interaction.canvasHeight - interaction.startY
      );
      height = this.clamp(
        interaction.startHeight + deltaY,
        this.minElementSize,
        maxHeight
      );
    }

    if (direction.includes("w")) {
      const rightEdge = interaction.startX + interaction.startWidth;
      const maxX = rightEdge - this.minElementSize;
      x = this.clamp(interaction.startX + deltaX, 0, maxX);
      width = rightEdge - x;
    }

    if (direction.includes("n")) {
      const bottomEdge = interaction.startY + interaction.startHeight;
      const maxY = bottomEdge - this.minElementSize;
      y = this.clamp(interaction.startY + deltaY, 0, maxY);
      height = bottomEdge - y;
    }

    const maxXByWidth = Math.max(0, interaction.canvasWidth - width);
    const maxYByHeight = Math.max(0, interaction.canvasHeight - height);
    x = this.clamp(x, 0, maxXByWidth);
    y = this.clamp(y, 0, maxYByHeight);

    if (
      x === elementData.x &&
      y === elementData.y &&
      width === elementData.width &&
      height === elementData.height
    ) {
      return;
    }

    elementData.x = x;
    elementData.y = y;
    elementData.width = width;
    elementData.height = height;
    this.applyElementLayout(elementNode, elementData);
  }

  getResizeCursor(direction) {
    const cursorMap = {
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      nw: "nwse-resize",
      se: "nwse-resize",
    };
    return cursorMap[direction] || "default";
  }

  clamp(value, min, max) {
    if (max < min) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new DesignerApp();
  window.designerApp = app;
});

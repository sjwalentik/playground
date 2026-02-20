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
    this.deleteButton = null;
    this.controlInputs = {
      x: null,
      y: null,
      width: null,
      height: null,
      backgroundColor: null,
      textContent: null,
    };

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

    const actionsSection = document.createElement("div");
    actionsSection.className = "controls-section controls-actions";

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
    deleteButton.disabled = true;
    this.deleteButton = deleteButton;

    actionsSection.appendChild(createBoxButton);
    actionsSection.appendChild(createTextButton);
    actionsSection.appendChild(createImageButton);
    actionsSection.appendChild(deleteButton);

    const actionsDivider = document.createElement("hr");
    actionsDivider.className = "controls-divider";

    const propertiesSection = document.createElement("div");
    propertiesSection.className = "controls-section";

    const propertiesHeading = document.createElement("h3");
    propertiesHeading.className = "controls-heading";
    propertiesHeading.textContent = "Properties";
    propertiesSection.appendChild(propertiesHeading);

    const geometryGrid = document.createElement("div");
    geometryGrid.className = "controls-grid";

    const xInput = this.createControlInput("number");
    xInput.min = "0";
    xInput.step = "1";
    xInput.addEventListener("input", () => {
      this.updateSelectedElementFromNumericInput("x", xInput.value);
    });

    const yInput = this.createControlInput("number");
    yInput.min = "0";
    yInput.step = "1";
    yInput.addEventListener("input", () => {
      this.updateSelectedElementFromNumericInput("y", yInput.value);
    });

    const widthInput = this.createControlInput("number");
    widthInput.min = String(this.minElementSize);
    widthInput.step = "1";
    widthInput.addEventListener("input", () => {
      this.updateSelectedElementFromNumericInput("width", widthInput.value);
    });

    const heightInput = this.createControlInput("number");
    heightInput.min = String(this.minElementSize);
    heightInput.step = "1";
    heightInput.addEventListener("input", () => {
      this.updateSelectedElementFromNumericInput("height", heightInput.value);
    });

    geometryGrid.appendChild(this.createControlField("X", xInput));
    geometryGrid.appendChild(this.createControlField("Y", yInput));
    geometryGrid.appendChild(this.createControlField("Width", widthInput));
    geometryGrid.appendChild(this.createControlField("Height", heightInput));
    propertiesSection.appendChild(geometryGrid);

    const backgroundInput = this.createControlInput("color");
    backgroundInput.value = "#ffffff";
    backgroundInput.addEventListener("input", () => {
      this.updateSelectedElementBackground(backgroundInput.value);
    });
    propertiesSection.appendChild(
      this.createControlField("Background", backgroundInput)
    );

    const textInput = this.createControlInput("text");
    textInput.placeholder = "Text content";
    textInput.addEventListener("input", () => {
      this.updateSelectedElementTextContent(textInput.value);
    });
    propertiesSection.appendChild(this.createControlField("Text", textInput));

    const exportDivider = document.createElement("hr");
    exportDivider.className = "controls-divider";

    const exportSection = document.createElement("div");
    exportSection.className = "controls-section";
    const exportButton = this.createControlButton(this.exportButtonLabel, () => {
      this.exportAsPng();
    });
    const exportStatus = document.createElement("p");
    exportStatus.className = "export-status";
    exportStatus.setAttribute("aria-live", "polite");
    exportStatus.hidden = true;

    exportSection.appendChild(exportButton);
    exportSection.appendChild(exportStatus);

    this.controlsPanel.appendChild(actionsSection);
    this.controlsPanel.appendChild(actionsDivider);
    this.controlsPanel.appendChild(propertiesSection);
    this.controlsPanel.appendChild(exportDivider);
    this.controlsPanel.appendChild(exportSection);

    this.exportButton = exportButton;
    this.exportStatusNode = exportStatus;
    this.controlInputs = {
      x: xInput,
      y: yInput,
      width: widthInput,
      height: heightInput,
      backgroundColor: backgroundInput,
      textContent: textInput,
    };

    this.updateControlsState();
  }

  createControlButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  createControlInput(type) {
    const input = document.createElement("input");
    input.type = type;
    input.className = "control-input";
    input.disabled = true;
    return input;
  }

  createControlField(labelText, inputNode) {
    const field = document.createElement("label");
    field.className = "control-field";

    const label = document.createElement("span");
    label.className = "control-field-label";
    label.textContent = labelText;

    field.appendChild(label);
    field.appendChild(inputNode);
    return field;
  }

  updateControlsState() {
    const selectedElement = this.getElementData(this.selectedElementId);
    const hasSelection = Boolean(selectedElement);

    if (this.deleteButton) {
      this.deleteButton.disabled = !hasSelection;
    }

    const geometryAndColorInputs = [
      this.controlInputs.x,
      this.controlInputs.y,
      this.controlInputs.width,
      this.controlInputs.height,
      this.controlInputs.backgroundColor,
    ];

    geometryAndColorInputs.forEach((inputNode) => {
      if (inputNode) {
        inputNode.disabled = !hasSelection;
      }
    });

    if (this.controlInputs.textContent) {
      this.controlInputs.textContent.disabled =
        !selectedElement || selectedElement.type !== "text";
    }

    if (!selectedElement) {
      this.clearControlInputValues();
      return;
    }

    this.syncControlInputs(selectedElement);
  }

  clearControlInputValues() {
    if (this.controlInputs.x) {
      this.controlInputs.x.value = "";
    }
    if (this.controlInputs.y) {
      this.controlInputs.y.value = "";
    }
    if (this.controlInputs.width) {
      this.controlInputs.width.value = "";
    }
    if (this.controlInputs.height) {
      this.controlInputs.height.value = "";
    }
    if (this.controlInputs.backgroundColor) {
      this.controlInputs.backgroundColor.value = "#ffffff";
    }
    if (this.controlInputs.textContent) {
      this.controlInputs.textContent.value = "";
    }
  }

  syncControlInputs(elementData) {
    if (this.controlInputs.x) {
      this.controlInputs.x.value = String(Math.round(elementData.x));
    }
    if (this.controlInputs.y) {
      this.controlInputs.y.value = String(Math.round(elementData.y));
    }
    if (this.controlInputs.width) {
      this.controlInputs.width.value = String(Math.round(elementData.width));
    }
    if (this.controlInputs.height) {
      this.controlInputs.height.value = String(Math.round(elementData.height));
    }
    if (this.controlInputs.backgroundColor) {
      this.controlInputs.backgroundColor.value =
        this.normalizeColorValue(elementData.backgroundColor);
    }
    if (this.controlInputs.textContent) {
      this.controlInputs.textContent.value =
        elementData.type === "text" ? elementData.content || "" : "";
    }
  }

  updateSelectedElementFromNumericInput(property, rawValue) {
    const elementData = this.getElementData(this.selectedElementId);
    const elementNode = this.getElementNode(this.selectedElementId);
    if (!elementData || !elementNode) {
      return;
    }

    const value = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(value)) {
      return;
    }

    const { width: canvasWidth, height: canvasHeight } = this.getCanvasSize();
    if (property === "x") {
      const maxX = Math.max(0, canvasWidth - elementData.width);
      elementData.x = this.clamp(value, 0, maxX);
    } else if (property === "y") {
      const maxY = Math.max(0, canvasHeight - elementData.height);
      elementData.y = this.clamp(value, 0, maxY);
    } else if (property === "width") {
      const maxWidth = Math.max(this.minElementSize, canvasWidth - elementData.x);
      elementData.width = this.clamp(value, this.minElementSize, maxWidth);
      const maxX = Math.max(0, canvasWidth - elementData.width);
      elementData.x = this.clamp(elementData.x, 0, maxX);
    } else if (property === "height") {
      const maxHeight = Math.max(this.minElementSize, canvasHeight - elementData.y);
      elementData.height = this.clamp(value, this.minElementSize, maxHeight);
      const maxY = Math.max(0, canvasHeight - elementData.height);
      elementData.y = this.clamp(elementData.y, 0, maxY);
    }

    this.applyElementLayout(elementNode, elementData);
    this.syncControlInputs(elementData);
  }

  updateSelectedElementBackground(colorValue) {
    const elementData = this.getElementData(this.selectedElementId);
    const elementNode = this.getElementNode(this.selectedElementId);
    if (!elementData || !elementNode) {
      return;
    }

    elementData.backgroundColor = this.normalizeColorValue(colorValue);
    this.applyElementAppearance(elementNode, elementData);
    this.syncControlInputs(elementData);
  }

  updateSelectedElementTextContent(textValue) {
    const elementData = this.getElementData(this.selectedElementId);
    const elementNode = this.getElementNode(this.selectedElementId);
    if (!elementData || !elementNode || elementData.type !== "text") {
      return;
    }

    elementData.content = textValue;
    this.applyElementAppearance(elementNode, elementData);
    this.syncControlInputs(elementData);
  }

  normalizeColorValue(value) {
    if (typeof value === "string" && /^#[\da-f]{6}$/i.test(value)) {
      return value;
    }
    return "#ffffff";
  }

  getCanvasExportBackgroundColor() {
    const canvasStyles = window.getComputedStyle(this.canvas);
    const cssVarColor = canvasStyles.getPropertyValue("--canvas-bg").trim();
    if (cssVarColor) {
      return cssVarColor;
    }

    const computedColor = canvasStyles.backgroundColor;
    if (
      computedColor &&
      computedColor !== "transparent" &&
      computedColor !== "rgba(0, 0, 0, 0)"
    ) {
      return computedColor;
    }

    return "#ffffff";
  }

  prepareClonedCanvasForExport(clonedDocument, backgroundColor) {
    const clonedCanvas = clonedDocument.getElementById(this.canvas.id);
    if (!clonedCanvas) {
      return;
    }

    // Keep the exported image clean by removing editor-only visual treatment.
    clonedCanvas.style.background = backgroundColor;
    clonedCanvas.style.boxShadow = "none";
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
      const exportBackground = this.getCanvasExportBackgroundColor();
      const renderedCanvas = await window.html2canvas(this.canvas, {
        scale: 1,
        width,
        height,
        backgroundColor: exportBackground,
        onclone: (clonedDocument) => {
          this.prepareClonedCanvasForExport(clonedDocument, exportBackground);
        },
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
      backgroundColor: this.getDefaultBackgroundColor(type),
    };

    const elementNode = document.createElement("div");
    elementNode.id = id;
    elementNode.className = "layout-element";
    elementNode.style.position = "absolute";
    elementNode.style.boxSizing = "border-box";
    elementNode.style.border = "1px solid #9ca3af";
    elementNode.style.cursor = "pointer";
    elementNode.style.overflow = "visible";
    elementNode.style.display = "flex";
    elementNode.style.alignItems = "stretch";
    elementNode.style.justifyContent = "stretch";

    const contentNode = document.createElement("div");
    contentNode.className = "layout-element-content";
    contentNode.style.flex = "1";
    contentNode.style.width = "100%";
    contentNode.style.height = "100%";
    contentNode.style.pointerEvents = "none";
    contentNode.style.overflow = "hidden";
    elementNode.appendChild(contentNode);

    this.applyElementLayout(elementNode, elementData);
    this.applyElementAppearance(elementNode, elementData);
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
      this.updateControlsState();
      return null;
    }

    const exists = this.elements.some((item) => item.id === elementId);
    if (!exists) {
      this.selectedElementId = null;
      this.updateControlsState();
      return null;
    }

    const selectionNode = this.getElementNode(elementId);
    if (selectionNode) {
      selectionNode.classList.add("is-selected");
      selectionNode.style.outline = "2px solid #2563eb";
      selectionNode.style.outlineOffset = "1px";
    }

    this.selectedElementId = elementId;
    this.updateControlsState();
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

    this.selectElement(null);
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

  getDefaultBackgroundColor(type) {
    if (type === "image") {
      return "#e5e7eb";
    }
    return "#ffffff";
  }

  applyElementLayout(elementNode, elementData) {
    elementNode.style.left = `${elementData.x}px`;
    elementNode.style.top = `${elementData.y}px`;
    elementNode.style.width = `${elementData.width}px`;
    elementNode.style.height = `${elementData.height}px`;
  }

  applyElementAppearance(elementNode, elementData) {
    elementNode.style.background = this.normalizeColorValue(elementData.backgroundColor);

    const contentNode = elementNode.querySelector(".layout-element-content");
    if (!contentNode) {
      return;
    }

    contentNode.textContent = "";
    contentNode.style.display = "none";
    contentNode.style.padding = "0";
    contentNode.style.alignItems = "stretch";
    contentNode.style.justifyContent = "flex-start";
    contentNode.style.color = "";
    contentNode.style.fontSize = "";

    if (elementData.type === "text") {
      contentNode.textContent = elementData.content || "";
      contentNode.style.display = "flex";
      contentNode.style.alignItems = "center";
      contentNode.style.padding = "8px";
      contentNode.style.color = "#111827";
      contentNode.style.fontSize = "14px";
    } else if (elementData.type === "image") {
      contentNode.textContent = elementData.content || "";
      contentNode.style.display = "flex";
      contentNode.style.alignItems = "center";
      contentNode.style.justifyContent = "center";
      contentNode.style.color = "#374151";
      contentNode.style.fontSize = "12px";
    }
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
    if (interaction.elementId === this.selectedElementId) {
      this.syncControlInputs(elementData);
    }
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
    if (interaction.elementId === this.selectedElementId) {
      this.syncControlInputs(elementData);
    }
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

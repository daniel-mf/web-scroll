(function (root) {

    let watchingWindowMove = false;

    const instances = [];

    function windowPointerMove({changedTouches}) {
        for (const webScroll of instances) {

            for (const {identifier, clientX, clientY} of changedTouches) {

                if (webScroll.pointers[identifier]) {
                    webScroll.pointerMove(identifier, clientX, clientY);
                }

            }
        }
    }

    class WebScroll {
        constructor(selector, {topIndex = 0} = {}) {

            if (!watchingWindowMove) {
                watchingWindowMove = true;
                window.addEventListener('touchmove', windowPointerMove);
            }

            instances.push(this);

            this.list = document.querySelector(selector);
            this.wrapper = this.list.querySelector('.wrapper');

            this.topIndex = topIndex;
            this.currentTranslateX = 0;
            this.currentTranslateY = 0;
            this.lastTranslateX = 0;
            this.lastTranslateY = 0;

            this.elements = [];
            this.pointers = {};
            this.observeScroll();
        }

        set structureData(data) {
            this._structureData = data;
            this.defineStructure();
        }

        set scrollTop(val) {
            this._scrollTop = val;
        }

        set lastItemElement(element) {
            if (this._lastItemElement) {
                delete this._lastItemElement.dataset.lastChild;
            }
            this._lastItemElement = element;
            this._lastItemElement.dataset.lastChild = '';
        }

        get lastItemElement() {
            return this._lastItemElement;
        }

        set firstItemElement(element) {
            if (this._firstItemElement) {
                delete this._firstItemElement.dataset.firstChild;
            }
            this._firstItemElement = element;
            this._firstItemElement.dataset.firstChild = '';
        }

        get firstItemElement() {
            return this._firstItemElement;
        }

        createStructureElementAt(index, top, size) {
            const element = document.createElement('div');
            element.classList.add('item');

            this.positionElement(element, index, false);

            return element;
        }

        positionElement(itemElement, index, positionedUp) {

            const structureSize = this._structureData[index];

            let top;

            if (!this.firstItemElement) {
                top = -structureSize;
            } else {
                if (positionedUp) {
                    const nextElement = this.getElementAt(index + 1);
                    top = parseFloat(nextElement.dataset.listTop) - structureSize;
                } else {
                    const previousElement = this.getElementAt(index - 1);
                    top = parseFloat(previousElement.dataset.listTop) + previousElement.getBoundingClientRect().height;
                }
            }

            if (positionedUp) {
                this.firstItemElement = itemElement;
            } else {
                this.lastItemElement = itemElement;
            }

            itemElement.dataset.listIndex = index;
            itemElement.dataset.listTop = top;

            itemElement.innerHTML = `<div><strong>${index}</strong> of <strong>${this._structureData.length}</strong></div>`;
            itemElement.style.transform = `translateZ(0) translateY(${top}px)`;
            itemElement.style.height = `${structureSize}px`;

        }

        defineStructure() {

            const listRect = this.list.getBoundingClientRect();

            let stopNext = false;

            let lastElement;

            let currentTop = 0;//listRect.top;

            const topIndex = this.topIndex ? this.topIndex - 1 : 0;

            for (let [index, size] of this._structureData.slice(topIndex).entries()) {

                const actualIndex = topIndex + index;

                if (!this.getElementAt(actualIndex)) {

                    const newStructureElement = this.createStructureElementAt(actualIndex, currentTop, size);

                    this.wrapper.appendChild(newStructureElement);

                    if (index === 0) {
                        this.firstItemElement = newStructureElement;
                    }

                    this.elements.push(newStructureElement);

                    lastElement = newStructureElement;

                    if (stopNext) {
                        console.log('stopped at', actualIndex);
                        break;
                    }

                    if (currentTop > listRect.height) {
                        stopNext = true;
                    }

                    currentTop += newStructureElement.getBoundingClientRect().height;

                }
            }

            this.lastItemElement = lastElement;

        }

        getElementAt(index) {
            for (const element of this.elements) {
                // noinspection EqualityComparisonWithCoercionJS
                if (element.dataset.listIndex == index) {
                    return element;
                }
            }
        }

        recycleElementTo(itemElement, newIndex, positionedUp) {
            if (positionedUp) {
                const lastElementIndex = parseInt(this.lastItemElement.dataset.listIndex);
                this.positionElement(itemElement, newIndex, true);
                this.lastItemElement = this.getElementAt(lastElementIndex - 1);
            } else {
                const firstElementIndex = parseInt(this.firstItemElement.dataset.listIndex);
                this.positionElement(itemElement, newIndex, false);
                this.firstItemElement = this.getElementAt(firstElementIndex + 1);
            }
        }

        refreshList() {

            const firstElement = this.firstItemElement;

            let ignoreLast = false;

            if (firstElement) {

                const listTop = parseFloat(firstElement.dataset.listTop);
                const listIndex = parseInt(firstElement.dataset.listIndex);

                if (listTop + this.currentTranslateY > 0) {

                    if (listIndex > 0) {
                        this.recycleElementTo(this.lastItemElement, listIndex - 1, true);
                    } else {
                        this.cancelMovement = true;
                    }
                }

            }

            const lastElement = this.lastItemElement;

            if (!ignoreLast && lastElement) {

                const listTop = parseFloat(lastElement.dataset.listTop);
                const listIndex = parseInt(lastElement.dataset.listIndex);

                const elementHeight = lastElement.getBoundingClientRect().height;
                const containerHeight = this.list.getBoundingClientRect().height;

                if ((listTop + this.currentTranslateY) + elementHeight < containerHeight) {
                    if (listIndex < this._structureData.length - 1) {
                        this.recycleElementTo(this.firstItemElement, listIndex + 1, false);
                    } else {
                        this.cancelMovement = true;
                    }
                }

            }

        }

        get hasAnyActivePointers() {
            return Object.keys(this.pointers).length > 0;
        }

        pointerDown({changedTouches}) {

            clearInterval(this.smothInterval);

            this.wrapper.classList.remove('scroll-end');
            for (const {identifier, clientX, clientY} of changedTouches) {
                this.pointers[identifier] = {clientX, clientY};
            }
        }

        pointerUp({changedTouches}) {

            for (const {identifier, clientX, clientY} of changedTouches) {

                this.lastTranslateY = this.currentTranslateY;
                this.lastTranslateX = this.currentTranslateX;

                delete this.pointers[identifier];
            }

            this.finishElasticity();

        }

        finishElasticity() {

            if (this.reachedTopLimitAt) {
                this.wrapper.classList.add('scroll-end');
                this.translateTo({y: this.reachedTopLimitAt});
                this.currentTranslateY = this.reachedTopLimitAt;
                this.lastTranslateY = this.reachedTopLimitAt;
            } else if (this.reachedBottomLimitAt) {
                this.wrapper.classList.add('scroll-end');
                this.translateTo({y: this.reachedBottomLimitAt});
                this.currentTranslateY = this.reachedBottomLimitAt;
                this.lastTranslateY = this.reachedBottomLimitAt;
            } else {
                if (this.movementY !== 0) {

                    const up = this.movementY > 0;

                    this.movementY *= .25;

                    const breakRatio = 0.0075 * (up ? this.movementY : -this.movementY);

                    let ratio = 0;

                    this.smothInterval = setInterval(() => {
                        if ((up && ratio < this.movementY) || (!up && ratio > this.movementY)) {
                            this.currentTranslateY += this.movementY - ratio;
                            this.translateTo({y: this.currentTranslateY});
                            this.lastTranslateY = this.currentTranslateY;
                            ratio += up ? breakRatio : -breakRatio;
                            this.refreshList();
                        } else {
                            clearInterval(this.smothInterval);
                        }
                    }, 0);

                    //break smoothly
                }
            }

        }

        pointerMove(identifier, clientX, clientY) {
            const pointerData = this.pointers[identifier];

            let changeY = ((clientY - pointerData.clientY) + this.lastTranslateY);

            const changed = this.currentTranslateY !== changeY;

            this.movementY = changeY - this.currentTranslateY;

            this.currentTranslateY = changeY;

            this.cancelMovement = false;

            if (changed) {
                this.refreshList();
            }

            if (this.cancelMovement) {

                const elasticLimit = 5;

                let topLimit = -parseFloat(this.firstItemElement.dataset.listTop);

                if (this.currentTranslateY >= topLimit) {
                    //elastic top

                    this.reachedTopLimitAt = topLimit;

                    topLimit = topLimit + ((changeY - topLimit) / elasticLimit);

                    changeY = topLimit;
                    this.currentTranslateY = changeY;

                } else {
                    //elastic bottom

                    let bottomLimit = -(parseFloat(this.lastItemElement.dataset.listTop)
                        + this.lastItemElement.getBoundingClientRect().height - this.list.getBoundingClientRect().height);

                    this.reachedBottomLimitAt = bottomLimit;

                    bottomLimit = bottomLimit + ((changeY - bottomLimit) / elasticLimit);

                    changeY = bottomLimit;
                    this.currentTranslateY = changeY;

                }
            } else {
                this.reachedTopLimitAt = null;
                this.reachedBottomLimitAt = null;
            }

            this.translateTo({y: changeY})

        }

        translateTo({y}) {
            this.wrapper.style.transform = `translateZ(0) translateY(${y}px)`;
        }

        observeScroll() {
            this.list.addEventListener('touchstart', () => this.pointerDown(event));
            this.list.addEventListener('touchend', () => this.pointerUp(event));
        }

    }

    root.WebScroll = WebScroll;

})(window);

window.onload = function () {
    const list = new WebScroll('#list');

    const data = [];

    let structureData = [
        70, 80, 90, 100, 110, 120, 250,
        70, 80, 90, 100, 110, 120, 250,
        70, 80, 90, 100, 110, 120, 250,
        70, 80, 90, 100, 110, 120, 250,
        70, 80, 90, 100, 110, 120, 250,
        70, 80, 90, 100, 110, 120, 250,
        70, 80, 90, 100, 110, 120, 250,
    ];

    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];
    structureData = [...structureData, ...structureData];

    console.log(structureData.length);

    list.topIndex = Math.round(structureData.length / 2);
    //list.topIndex = 2;

    list.structureData = structureData;

};
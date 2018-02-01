window.addEventListener('load', function () {

    const list = new WebScroll('#list');

    list.length = 400000;
    list.topIndex = Math.round(list.length / 2) - 1;

    list.onElementRequested(function (element, index) {
        element.innerHTML = `<div><strong>${index + 1}</strong> of <strong>${this.length}</strong></div>`;
    });

    list.render();

});
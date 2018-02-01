window.addEventListener('load', function () {

    const list = new WebScroll('#list');

    list.length = 400000;
    list.topIndex = Math.round(list.length / 2) - 1;

    const data = [];

    async function loadData(dataIndex) {

        if (data.indexOf(dataIndex) > -1) {
            return true; //previously loaded
        }

        data.push(dataIndex);

        return await new Promise(release => setTimeout(release, 1000));

    }

    list.onElementRequested(function (element, index, transform) {

        element.innerHTML = `<div><strong>${index + 1}</strong> of <strong>${this.length}</strong></div>`;

        //load remote data
        loadData(index).then(() => {

            //transform will only execute if the element is still visible in the list
            transform(() => {
                element.innerHTML = `<div><strong>${index + 1}</strong> of <strong>${this.length}</strong> transformed</div>`;
            });

        });

    });

    list.render();

});
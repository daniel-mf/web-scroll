window.addEventListener('load', function () {

    function createList(querySelector, options = {}) {

        const list = new WebScroll(querySelector, options);

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

        const dataLength = {};

        function getDataLength(dataIndex) {
            if (!(dataIndex in dataLength)) {
                dataLength[dataIndex] = Math.floor(50 + (Math.random() * 350));
            }
            return dataLength[dataIndex];
        }

        list.onElementRequested(function (element, index, transform) {

            let dataPlaceHolder = '';

            if (!options.fixedHeight) {
                dataPlaceHolder = 'x'.repeat(getDataLength(index));
            }

            element.innerHTML = `
                <div>
                    <strong>${index + 1}</strong> of <strong>${this.length}</strong>
                    <span class="status"></span>
                    <div class="dynamic-data"><span class="data-place-holder">${dataPlaceHolder}</span></div>
                </div>
            `;

            //load remote data
            loadData(index).then(() => {

                //transform will only execute if the element is still visible in the list
                transform(() => {

                    element.querySelector('.status').textContent = 'transformed';

                    if (!options.fixedHeight) {
                        element.querySelector('.dynamic-data').innerHTML = 'a'.repeat(getDataLength(index));
                    }

                });

            });

        });

        list.render();

    }

    createList('.fixed-height > .container', {fixedHeight: true});
    createList('.dynamic-height > .container');


});
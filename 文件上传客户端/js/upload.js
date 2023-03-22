// 基于Form-Data 实现文件上传
(function () {
    let upload = document.querySelector('#upload1');
    let upload_inp = upload.querySelector('.upload_inp');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_button_upload = upload.querySelector('.upload_button.upload');
    let upload_tip = upload.querySelector('.upload_tip');
    let upload_list = upload.querySelector('.upload_list');
    let _file = null;

    // 上传等待图标（loading）的显示与隐藏
    const changeDisable = (flag) => {
        // 增加类名
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        // 移除类名
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };

    // 上传到服务器
    upload_button_upload.addEventListener('click', () => {
        // 如果正在上传 再点击就直接返回，不执行
        if (
            upload_button_upload.classList.contains('disable') ||
            upload_button_upload.classList.contains('loading')
        )
            return;
        if (!_file) return alert('请你选择上传文件');
        // 显示图标loading
        changeDisable(true);
        // 把文件传递给服务器：FormData / BASE64
        let formData = new FormData();
        formData.append('file', _file);
        formData.append('filename', _file.name);
        instance
            .post('/upload_single', formData)
            .then((data) => {
                // 成功
                if (+data.code === 0)
                    return alert(`文件上传成功，可以访问: ${data.servicePath}路径`);
                // 失败
                return Promise.reject(data.codeText);
            })
            .catch((err) => {
                alert(Promise.reject('文件上传失败', err));
            })
            .finally(() => {
                // 移除文件 以及提示文字
                clearHandle();
                // 隐藏 loading
                changeDisable(false);
            });
    });

    // 封装 显示 和 隐藏 的方法
    const clearHandle = () => {
        _file = null;
        upload_tip.style.display = 'block';
        upload_list.style.display = 'none';
        upload_list.innerHTML = ``;
    };
    // 移除按钮点击处理
    upload_list.addEventListener('click', (evnet) => {
        let target = evnet.target;
        // 如果点击的是移除按钮，（EM 是em标签的大写）
        if (target.tagName === 'EM') {
            clearHandle();
        }
    });

    // 监听用户选择文件操作
    upload_inp.addEventListener('change', () => {
        // 获取用户选中的文件 upload_inp.files
        /*
                name:"1.jpg" 文件名
                size:573031  文件大小
                type :"image/jpeg"  // 文件类型
            */
        let file = upload_inp.files[0];
        if (!file) return;
        // 限定文件上传类型格式
        if (!/(PNG|JPG|JPEG)/i.test(file.type))
            return alert('上传文件只能是PNG|JPG|JPEG');
        // 限定文件大小 2MB
        if (file.size > 2 * 1024 * 1024) return alert('上传文件不能大于2MB');
        _file = file;

        // 显示上传文件
        upload_tip.style.display = 'none';
        upload_list.style.display = 'block';
        upload_list.innerHTML = `
            <li>
                <span>文件：${file.name}</span>
                <span><em>移除</em></span>
            </li>
        `;
    });

    // 点击选择文件按钮，上传文件
    upload_button_select.addEventListener('click', () => {
        // 如果正在上传 再点击就直接返回，不执行
        if (
            upload_button_upload.classList.contains('disable') ||
            upload_button_upload.classList.contains('loading')
        )
            return;
        upload_inp.click();
    });
})();

// 基于Base64 实现文件上传
(function () {
    let upload = document.querySelector('#upload2'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select');

    // 是否处于可操作状态
    const checkIsDisable = (element) => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    // 把选择文件读取成base64
    const changeBASE64 = (file) => {
        return new Promise((resolve) => {
            // js 内置类, 很多方法转换成各种格式
            let fileReader = new FileReader();
            // 转成base64
            fileReader.readAsDataURL(file);
            // 异步的
            fileReader.onload = (event) => {
                resolve(event.target.result);
            };
        });
    };
    // 上传图片
    upload_inp.addEventListener('change', async function (ev) {
        let file = upload_inp.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return alert('上传文件大小不能大于2MB');
        // 动画loading
        upload_button_select.classList.add('loading');
        // 转成base64
        let fileBase64 = await changeBASE64(file);
        try {
            let data = await instance.post(
                '/upload_single_base64',
                {
                    // 编码防止出现乱码
                    file: encodeURIComponent(fileBase64),
                    filename: file.name,
                },
                {
                    //请求头
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );
            if (+data.code === 0) {
                console.log(data);
                return alert(`文件上传成功,查看${data.servicePath}`);
            }
            // 否则就失败 ，抛出异常，就走catchl
            throw data.codeText;
        } catch (error) {
            alert('文件上传失败', error);
        } finally {
            // 移除loading
            upload_button_select.classList.remove('loading');
            // 解决重复上传一张图片，change事件不触发情况
            ev.target.value = null;
        }
    });
    // 点击上传
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();

// hash文件名
(function () {
    let upload = document.querySelector('#upload3'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_button_upload = upload.querySelector('.upload_button.upload'),
        upload_abbre = upload.querySelector('.upload_abbre'),
        upload_abbre_img = upload.querySelector('.upload_abbre img');
    let _file = null;

    // 转成 base64
    const changeBASE64 = (file) => {
        return new Promise((resolve) => {
            let fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = (event) => {
                resolve(event.target.result);
            };
        });
    };
    // 用 buffer 转成 hash, 用于文件名
    const changeBuffer = (file) => {
        return new Promise((resolve) => {
            let fileReader = new FileReader();
            // 转成buffer
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = (event) => {
                // 拿到buffer
                let buffer = event.target.result;
                // md5插件
                let spark = new SparkMD5.ArrayBuffer();
                // 添加进去
                spark.append(buffer);
                // 结束之后生成 hash
                let HASH = spark.end();
                // 拿到后缀 .jpg 什么的
                let suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename: `${HASH}.${suffix}`,
                });
            };
        });
    };
    // 是否正在上传到服务器, 添加或者删除样式
    const changeDisable = (flag) => {
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };
    //上传到服务器
    upload_button_upload.addEventListener('click', async function () {
        if (checkIsDisable(this)) return;
        if (!_file) {
            alert('请你选择上传文件');
            return;
        }
        changeDisable(true);
        // 生成文件 hash名
        let { filename } = await changeBuffer(_file);
        let formData = new FormData();
        formData.append('file', _file);
        formData.append('filename', filename);
        // 上传
        instance
            .post('/upload_single_name', formData)
            .then((data) => {
                if (+data.code === 0) {
                    alert(`文件上传成功，可以访问${data.servicePath}`);
                    return;
                }
                return Promise.reject(data.codeText);
            })
            .catch((error) => {
                alert('文件上传失败', error);
            })
            .finally(() => {
                changeDisable(false);
                upload_abbre.style.display = 'none';
                upload_abbre_img.src = '';
                _file = null;
            });
    });
    //判断是否正在上传，正在上传就处于不可操作状态
    const checkIsDisable = (element) => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    // 监听选择文件事件（文件改变）
    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0];
        if (!file) return;
        _file = file;
        // 为上传按钮添加 disable类， 处于上传状态，不可点击（上面有一个方法，只要有disable属性 的点击就直接return，不能操作）
        upload_button_select.classList.add('disable');
        // 文件预览，就是把文件对象转成base64 赋值给图片的src属性
        let BASE64 = await changeBASE64(file);
        upload_abbre.style.display = 'block';
        upload_abbre_img.src = BASE64;
        // 上传完，就移除
        // setTimeout(()=>{
        //     upload_button_select.classList.remove('disable')
        // },700)
        upload_button_select.classList.remove('disable');
    });

    // 选择文件按钮(自己定义的按钮，监听，点击了，就调用真正上传文件的 click)
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();
const delay = function delay (interval) {
    typeof interval !== 'number' ? (interval = 1000) : null;
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};
// 进度条管控
(function () {
    let upload = document.querySelector('#upload4');
    let upload_inp = upload.querySelector('.upload_inp');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_progress = upload.querySelector('.upload_progress');
    let upload_progress_value = upload_progress.querySelector('.value');

    // 判断是否处于上传状态
    const checkIsDisable = (element) => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    // 上传监听 change 事件
    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0];
        if (!file) return;
        upload_button_select.classList.add('loading');

        try {
            let formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);
            let data = await instance.post('/upload_single', formData, {
                // 回调
                onUploadProgress (ev) {
                    //loaded 已经上传多少，  total总数
                    let { loaded, total } = ev;
                    upload_progress.style.display = 'block';
                    // 上传百分比
                    upload_progress_value.style.width = `${(loaded / total) * 100}%`;
                },
            });
            if (+data.code === 0) {
                // 上传完，进度条变为100%
                upload_progress_value.style.width = `100%`;
                await delay(300);
                alert(`文件上传成功，可以访问${data.servicePath}`);
                return;
            }
            throw data.codeText;
        } catch (error) {
            alert('很遗憾，文件上传失败');
        } finally {
            // 关闭loading效果
            upload_button_select.classList.remove('loading');
            // 不管失败还是成功 进度条 设置隐藏， 并且为 0%
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = `0%`;
        }
    });
    // 选择文件
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();
// 多文件上传
(function () {
    let upload = document.querySelector('#upload5'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_button_upload = upload.querySelector('.upload_button.upload'),
        upload_list = upload.querySelector('.upload_list');
    let _files = [];
    // 上传服务器是否可操作
    const changeDisable = (flag) => {
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };
    // 上传服务器按钮
    upload_button_upload.addEventListener('click', async function () {
        if (checkIsDisable(this)) return
        if (_files.length === 0) {
            alert("请选择上传的文件")
            return
        }
        changeDisable(true)
        // 获取 li
        let upload_list_arr = [...upload_list.querySelectorAll('li')]
        // 循环发送请求
        _files = _files.map(item => {
            let fm = new FormData
            let curLi = upload_list_arr.find(liBox => liBox.getAttribute('key') === item.key)
            let curSpan = curLi ? curLi.querySelector('span:nth-last-child(1)') : null
            fm.append('file', item.file)
            fm.append('filename', item.filename)
            return instance.post('/upload_single', fm, {
                // 监听每个上传进度
                onUploadProgress (event) {
                    curSpan.innerHTML = `${(event.loaded / event.total * 100).toFixed(2)}%`
                }
            }).then(data => {
                if (+data.code === 0) {
                    if (curSpan) curSpan.innerHTML = `100%`
                    return
                }
                return Promise.reject()
            })
        })
        Promise.all(_files).then(() => {
            alert('所有文件上传成功')
        }).catch(() => {
            alert('文件上传失败')
        }).finally(() => {
            changeDisable(false)
            _files = []
            upload_list.innerHTML = ''
            upload_list.style.display = 'none'
        })

    })
    // 验证是否属于可操作状态
    const checkIsDisable = element => {
        let classList = element.classList
        return classList.contains('disable') || classList.contains('loading')
    }
    // 移除文件DOM操作的事件委托(只是结构上移除，_files)
    upload_list.addEventListener('click', function (ev) {
        let target = ev.target
        let curLi = null
        let key
        if (target.tagName === 'EM') {
            curLi = target.parentNode.parentNode
            if (!curLi) return
            // 移除结构上的
            upload_list.removeChild(curLi)
            // 获取属性key
            key = curLi.getAttribute('key')
            // 移除 _files 数组里面的
            _files = _files.filter(item => item.key !== key)
        }
    })

    // 生成唯一 key (随机数 * 时间戳)
    const createRandom = () => {
        let random = Math.random() * new Date()
        // 转成16进制的字符串, 并且 把小数点去掉
        return random.toString(16).replace('.', '')
    }
    // 选择文件
    upload_inp.addEventListener('change', function () {
        _files = [...upload_inp.files]
        if (_files.length === 0) return
        // 重构 _files 添加 key,用于删除元素
        _files = _files.map(file => {
            return {
                file,
                filename: file.name,
                key: createRandom()
            }
        })
        let str = ``
        _files.forEach((item, index) => {
            str += `<li key="${item.key}">
                    <span>文件${index + 1}：${item.filename}</span>
                    <span><em>移除</em></span>
                </li>`
        })
        upload_list.innerHTML = str
        upload_list.style.display = 'block'
    })

    // 点击选择文件按钮
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return
        upload_inp.click()
    })
})();
// 拖拽上传
(function(){
    let upload = document.querySelector('#upload6')
    let upload_inp = upload.querySelector('.upload_inp')
    let upload_submit = upload.querySelector('.upload_submit')
    let upload_mark = upload.querySelector('.upload_mark')
    let flag = false
    // 文件上传方法
    const uploadFile = async file =>{
        if(flag) return
        flag = true
        upload_mark.style.display = 'block'
        try{
            let fm = new FormData()
            fm.append('file',file)
            fm.append('filename',file.name)
            let data = await instance.post('/upload_single',fm)
            if(+data.code === 0){
                alert(`文件上传成功,查看${data.servicePath}`)
                return
            }
            throw data.codeText
        }catch(err){
            alert(err,'文件上传失败')
        }finally{
            upload_mark.style.display = 'none'
            flag = false
        }
    }
    // 拖拽获取
    // upload.addEventListener('dragenter',function(){
    //     console.log('进入')
    // })
    // upload.addEventListener('dragleave',function(){
    //     console.log('离开')
    // })
    upload.addEventListener('dragover',function(e){
        e.preventDefault()
        // console.log('区域内移动')
    })
    upload.addEventListener('drop',function(e){
        e.preventDefault()
        let file = e.dataTransfer.files[0]
        if(!file) return
        uploadFile(file)
        // console.log('放在容器中')
    })

    // 手动选择
    upload_inp.addEventListener('change',function(){
        let file = upload_inp.files[0]
        if(!file) return
        uploadFile(file)
    })
    //提交按钮
    upload_submit.addEventListener('click',function(){
        upload_inp.click()
    })
})();

//切片上传
(function () {
    let upload = document.querySelector('#upload7');
    let upload_inp = upload.querySelector('.upload_inp');
    let upload_button_select = upload.querySelector('.upload_button.select');
    let upload_progress = upload.querySelector('.upload_progress');
    let upload_progress_value = upload_progress.querySelector('.value');

    // 判断是否处于上传状态
    const checkIsDisable = (element) => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };
    // 先转成 buffer 然后SparkMD5计算
    // 用 buffer 转成 hash, 用于文件名
    const changeBuffer = (file) => {
        return new Promise((resolve) => {
            let fileReader = new FileReader();
            // 转成buffer
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = (event) => {
                // 拿到buffer
                let buffer = event.target.result;
                console.log(buffer)
                // md5插件
                let spark = new SparkMD5.ArrayBuffer();
                // 添加进去
                spark.append(buffer);
                // 结束之后生成 hash
                let HASH = spark.end();
                // 拿到后缀 .jpg 什么的
                let suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename: `${HASH}.${suffix}`,
                });
            };
        });
    };
    // 上传监听 change 事件
    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0];
        if (!file) return;
        upload_button_select.classList.add('loading');
        upload_progress.style.display = 'block'
        // 获取文件hash
        let {HASH, suffix} = await changeBuffer(file)
        // 获取已经上传的切片信息
        let data = null
        let already = []
        try {
            data = await instance.get('upload_already',{
                params:{
                    HASH
                }
            })
            if(+data.code === 0){
                already = data.fileList
            }
        } catch (error) {
            
        }

        // 实现文件切片处理 [固定数量 & 固定大小]
        let max = 1024 * 100  // 100 KB
        let count = Math.ceil(file.size / max)
        let index = 0
        let chunks = []
        if(count > 100){ // 如果数量大于100就按照 100来算
            count = 100
            max = file.size / 100
        }
        while(index < count){
            chunks.push({
                file: file.slice(index * max, (index + 1) * max),
                filename: `${HASH}_${index+1}.${suffix}`
            })
            index++
        }
        index = 0
        console.log(chunks)
        // 清除样式
        const clear = ()=>{
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none'
            upload_progress_value.style.width = '0%'
        }
        // 上传成功的处理
        const complete = async()=>{
            // 管控进度条
            index++
            upload_progress_value.style.width = `${index/count*100}%`
            if(index < count) return
            //所有切片上传成功，合成切片
            upload_progress_value.style.width = '100%'
            try {
                data = await instance.post('/upload_merge',{
                    HASH,
                    count
                },{
                    headers:{
                        'Content-Type':'application/x-www-form-urlencoded'
                    }
                })
                if(+data.code === 0){
                    alert('上传成功')
                    clear()
                    return
                }
                throw data.codeText
            } catch (error) {
                alert('切片合并失败')
                clear()
            }
        }
        // 把每一个切片都上传到服务器
        chunks.forEach(chunk =>{
            if(already.length > 0 && already.includes(chunk.filename)){
                complete()
                return
            }
            let fm = new FormData()
            fm.append('file',chunk.file)
            fm.append('filename', chunk.filename)
            instance.post('/upload_chunk',fm).then(data=>{
                if(+data.code === 0){
                    complete()
                    return
                }
                return Promise.reject(data.codeText)
            }).catch((err)=>{
                alert('当前切片上传失败',err)
                clear()
            })

        })

    });
    // 选择文件
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();
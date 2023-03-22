const express = require('express'),
    fs = require('fs'),
    bodyParser = require('body-parser'),
    multiparty = require('multiparty'),
    SparkMD5 = require('spark-md5');
/*
    multiparty插件的构造函数接收一个对象作为参数，参数是可选的，可以不传。
        1、参数的属性有：
            encoding：formdata的数据设置编码，默认是utf-8。 
            maxFieldsSize:限制字段，按字节分配的内存量，默认是2M，超出则会产生错误。 
            maxFields：限制被解析字段的数量，默认为1000。
            maxFilesSize：此属性只有在autoFiles为true的时候生效，设置上传文件接收字节的最大数量。也就是限制最大能上传多大的文件。
            autoFields：启用字段事件，并禁用字段的部分时间。如果监听字段事件，该属性自动为true。
            autoFiles：启用文件事件，并禁用部分文件事件，如果监听文件事件，则默认为true。
            uploadDir：放置文件的目录，只有autoFiels为true是有用
        2、实例化完构造函数后，开始正式解析FormData数据。利用parse()方法来解析。方法接收两个参数，无返回值。
            第一个参数为request对象，把创建服务时，回掉函数中的第一个参数传进去就可以。
            第二个参数是cb，一个回掉函数，通过该回掉函数，可以获取到解析后的数据。
                如果你是上传文件，使用这个回调函数的话。你不需要在执行写入文件的工作了，因为插件已经完成了
                你只需要设置好uploadDir属性，然后做些后续操作就可以了。因为回掉函数会默认开启autoFields和autoFlies
                个人感觉应该是内部监听field和file事件。回调函数，它有三个参数，第一个参数是err，第二个参数是fields，第三个参数是flies。
                err是发生错误时，返回的异常信息；fields是一个对象，存储着FormData里的字段信息；files存储的是文件信息。
                如果你把整个file对象直接放进formData内，则有值，否则为空对象。假如你想自己写文件的话，这个回调函数完全可以忽略掉。
*/
/*-CREATE SERVER-*/
const app = express(),
    PORT = 8888,
    HOST = 'http://127.0.0.1',
    HOSTNAME = `${HOST}:${PORT}`;
app.listen(PORT, () => {
    console.log(`THE WEB SERVICE IS CREATED SUCCESSFULLY AND IS LISTENING TO THE PORT：${PORT}，YOU CAN VISIT：${HOSTNAME}`);
});

/*-中间件-*/
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    req.method === 'OPTIONS' ? res.send('CURRENT SERVICES SUPPORT CROSS DOMAIN REQUESTS!') : next();
});
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '1024mb'
}));

/*-API-*/
// 延迟函数
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

// 检测文件是否存在
const exists = function exists(path) {
    return new Promise(resolve => {
        fs.access(path, fs.constants.F_OK, err => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
};

// 创建文件并写入到指定的目录 & 返回客户端结果
const writeFile = function writeFile(res, path, file, filename, stream) {
    return new Promise((resolve, reject) => {
        if (stream) {
            try {
                // 创建一个可读管道 (用于写入大文件)
                let readStream = fs.createReadStream(file.path),
                // 创建一个可写管道
                    writeStream = fs.createWriteStream(path);
                // 用一个管（pipe方法）连接管道
                readStream.pipe(writeStream);
                // 写入结束
                readStream.on('end', () => {
                    resolve();
                    // 删除
                    fs.unlinkSync(file.path);
                    /*  __dirname: 当前模块的目录名。与 path.dirname(__filename)相同。
                            示例：从 /Users/mjr 运行 node example.js
                                console.log(__dirname); 打印: /Users/mjr
                                console.log(path.dirname(__filename)); 打印: /Users/mjr
                    */
                    res.send({
                        code: 0,
                        codeText: 'upload success',
                        originalFilename: filename,
                        servicePath: path.replace(__dirname, HOSTNAME)
                    });
                });
            } catch (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
            }
            return;
        }
        fs.writeFile(path, file, err => {
            if (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
                return;
            }
            resolve();
            res.send({
                code: 0,
                codeText: 'upload success',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
        });
    });
};

// 基于multiparty插件实现文件上传处理 & form-data解析
const uploadDir = `${__dirname}/upload`;
const multiparty_upload = function multiparty_upload(req, auto) {
    typeof auto !== "boolean" ? auto = false : null;
    let config = {
        maxFieldsSize: 200 * 1024 * 1024,
    };
    //上传图片保存的地址 目录必须存在
    if (auto) config.uploadDir = uploadDir;
    return new Promise(async (resolve, reject) => {
        await delay();
        new multiparty.Form(config)
            .parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({
                    fields,
                    files
                });
            });
    });
};

// 单文件上传处理「FORM-DATA」
app.post('/upload_single', async (req, res) => {
    try {
        let {
            files
        } = await multiparty_upload(req, true);
        let file = (files.file && files.file[0]) || {};
        res.send({
            code: 0,
            codeText: 'upload success',
            originalFilename: file.originalFilename,
            servicePath: file.path.replace(__dirname, HOSTNAME)
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});

app.post('/upload_single_name', async (req, res) => {
    try {
        let {
            fields,
            files
        } = await multiparty_upload(req);
        let file = (files.file && files.file[0]) || {},
            filename = (fields.filename && fields.filename[0]) || "",
            path = `${uploadDir}/${filename}`,
            isExists = false;
        // 检测是否存在
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        writeFile(res, path, file, filename, true);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});

// 单文件上传处理「BASE64」
app.post('/upload_single_base64', async (req, res) => {
    let file = req.body.file,
        filename = req.body.filename,
        spark = new SparkMD5.ArrayBuffer(),
        suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1],
        isExists = false,
        path;
    //decodeURIComponent() 方法用于解码由 encodeURIComponent 方法或者其它类似方法编码的部分统一资源标识符（URI）。
    file = decodeURIComponent(file);
    file = file.replace(/^data:image\/\w+;base64,/, "");
   /*   
    JavaScript 语言自身只有字符串数据类型，没有二进制数据类型。
    但在处理像TCP流或文件流时，必须使用到二进制数据。因此在 Node.js中，定义了一个 Buffer 类，该类用来创建一个专门存放二进制数据的缓存区。
    在 Node.js 中，Buffer 类是随 Node 内核一起发布的核心库。Buffer 库为 Node.js 带来了一种存储原始数据的方法，
    可以让 Node.js 处理二进制数据，每当需要在 Node.js 中处理I/O操作中移动的数据时，就有可能使用 Buffer 库。原始数据存储在 Buffer 类的实例中。
    一个 Buffer 类似于一个整数数组，但它对应于 V8 堆内存之外的一块原始内存。
        Buffer.from(obj, encoding) 方法创建一个用指定字符串、数组或缓冲区填充的新缓冲区。
            obj: 必需。填充缓冲区的对象。 
                合法对象类型:
                    String
                    Array
                    Buffer
                    arrayBuffer等
            encoding: 可选。如果对象是字符串，则该参数用于指定其编码。 默认"utf8"
   */ 
    // 将 base64格式的转成buffer
    file = Buffer.from(file, 'base64');
    spark.append(file);
    // console.log(uploadDir,spark.end(),suffix)
    path = `${uploadDir}/${spark.end()}.${suffix}`;
    await delay();
    // 检测是否存在
    isExists = await exists(path);
    if (isExists) {
        res.send({
            code: 0,
            codeText: 'file is exists',
            originalFilename: filename,
            servicePath: path.replace(__dirname, HOSTNAME)
        });
        return;
    }
    writeFile(res, path, file, filename, false);
});

// 大文件切片上传 & 合并切片
const merge = function merge(HASH, count) {
    return new Promise(async (resolve, reject) => {
        let path = `${uploadDir}/${HASH}`, //文件路径
            fileList = [], // 文件列表
            suffix, //文件后缀
            isExists;//文件是否存在
        isExists = await exists(path);
        if (!isExists) {
            reject('HASH path is not found!');
            return;
        }
        // 读取目录的内容。返回: <Promise> 使用目录中文件的名称数组，得到名称数组。
        fileList = fs.readdirSync(path);
        // console.log(fileList,"返回: <Promise> 使用目录中文件的名称数组（不包括 '.' 和 '..'）履行")
        if (fileList.length < count) {
            reject('the slice has not been uploaded!');
            return;
        }
        fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        }).forEach(item => {
            !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1] : null;
            // 同步地读取文件的全部内容（fs.readFileSync）。//同步合并分片（fs.appendFileSync）
            fs.appendFileSync(`${uploadDir}/${HASH}.${suffix}`, fs.readFileSync(`${path}/${item}`));
            fs.unlinkSync(`${path}/${item}`); //删除分片（同步）
        });
        fs.rmdirSync(path); //删除原来分片目录，也就是文件夹
        resolve({
            path: `${uploadDir}/${HASH}.${suffix}`,
            filename: `${HASH}.${suffix}`
        });
    });
};
// 上传分片（接口）
app.post('/upload_chunk', async (req, res) => {
   console.log(111)
    try {
        let {
            fields,
            files
        } = await multiparty_upload(req);
        let file = (files.file && files.file[0]) || {},
            filename = (fields.filename && fields.filename[0]) || "",
            path = '',
            isExists = false;
        // 创建存放切片的临时目录
        let [, HASH] = /^([^_]+)_(\d+)/.exec(filename);
        path = `${uploadDir}/${HASH}`;
        !fs.existsSync(path) ? fs.mkdirSync(path) : null;
        // 把切片存储到临时目录中
        path = `${uploadDir}/${HASH}/${filename}`;
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        writeFile(res, path, file, filename, true);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});
// 合成分片（接口）
app.post('/upload_merge', async (req, res) => {
    let {
        HASH,
        count
    } = req.body;
    try {
        let {
            filename,
            path
        } = await merge(HASH, count);
        res.send({
            code: 0,
            codeText: 'merge success',
            originalFilename: filename,
            servicePath: path.replace(__dirname, HOSTNAME)
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});
// 获取以及上传的分片
app.get('/upload_already', async (req, res) => {
    let {
        HASH
    } = req.query;
    let path = `${uploadDir}/${HASH}`,
        fileList = [];
    try {
        fileList = fs.readdirSync(path);
        fileList = fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        });
        res.send({
            code: 0,
            codeText: '',
            fileList: fileList
        });
    } catch (err) {
        res.send({
            code: 0,
            codeText: '',
            fileList: fileList
        });
    }
});

app.use(express.static('./'));
app.use((req, res) => {
    res.status(404);
    res.send('NOT FOUND!');
});
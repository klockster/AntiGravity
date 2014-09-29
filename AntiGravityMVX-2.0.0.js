(function(root){
    var AntiGravity = root.AntiGravity = (root.AntiGravity || {});

    if (!Node.prototype.remove){
        Node.prototype.remove = function(){
            this.parentNode.removeChild(this);
        };
    }

    var Model = AntiGravity.Model = function(obj){
        this.collection = new observableArray([]);
        var object = object || {};
        var k = Object.keys(object);
        for (var i = 0; i < k.length; i++){
            var val = object[k[i]];
            if (typeof val === "function"){
                this[k[i]] = val.bind(this);
            } else {
                this[k[i]] = val;
            }
        }
    };

    Model.prototype.fetchWhere = function(attrPairs, parseCB, url){
        var self = this;
        agAJAX({
            url: url || self.singleURL,
            data: attrPairs,
            type: 'GET',
            success: parseCB
        });
    };

    Model.prototype.fetchAllWhere = function(attrPairs, parseCB, url){
        var self = this;
        agAJAX({
            url: url || self.allURL,
            data: attrPairs,
            type: 'GET',
            success: parseCB
        });
    };

    Model.prototype.save = function(modelObj, cb, url){
        // TODO: go to update if it already has an id
        var self = this;
        agAJAX({
            url: url || self.singleURL,
            data: modelObj,
            type: 'POST',
            success: cb
        });
    };

    Model.prototype.update = function(modelObj, cb, url){
        // TODO: go to save if it doesn't have an id
        var self = this;
        agAJAX({
            url: url || self.singleURL,
            data: modelObj,
            type: 'PUT',
            success: cb
        });
    };

    Model.prototype.destroy = function(modelObj, cb, url){
        var self = this;
        agAJAX({
            url: url || self.singleURL,
            data: modelObj,
            type: 'DELETE',
            success: cb
        });
    };

    Model.prototype.parseToCollection = function(pojos, remapPropertyObject){
        var pojos = JSON.parse(JSON.stringify(pojos));
        _parseToCollection.call(this, pojos, remapPropertyObject);
    };

    var _parseToCollection = function(pojos, remapPropertyObject){
        var remapPropertyObject = remapPropertyObject || {};
        // remapPropertyObject maps properties on the pojos to collections on another model
        pojos = (pojos instanceof Array) ? pojos : [pojos];
        pojos.map(function(pojo){
            var keys = Object.keys(pojo);
            keys.forEach(function(key){
                if (remapPropertyObject[key]){
                    pojo[key] = _parseToCollection.call(remapPropertyObject[key], pojo[key], remapPropertyObject);
                }
            });
            return pojo;
        });

        // TODO: what do we do here?
        var result = new observableArray(pojos);
        this.collection.push.apply(this.collection, pojos);
        return result;
    };

    // TODO: hasMany

    // TODO: belongsTo

    // TODO: how do $viewModel and collection stay in sync?
        /*
            Where will $viewModel live? 
                - Is it a Model attribute?
            How does it get populated?
                - whenever shit is rendered?
            How does it not get overpopulated?
            --------------------------------
            Maybe the Cross gets it instead.
            This seems to make more sense and be closer to how Angular does it.
            If the Model upon which the Cross's $viewModel is based has a collection change
                - the $viewModels of all Crosses based on that Model's collection should update.
                    - But how???

            $viewModel should have reference to collection?
                - Where is $viewModel set? render? on the Cross init?

            MAYBE: $viewModel should be set on render by passing in the model?

        */

    var Cross = AntiGravity.Cross = function(object){
        var object = object || {};
        var k = Object.keys(object);
        for (var i = 0; i < k.length; i++){
            var val = object[k[i]];
            if (k[i] === "$viewModel") {
                this[k[i]] = (typeof val === "function") ? new AntiGravity.observableArray(val()) : val;
            }
            else if (typeof val === "function"){
                this[k[i]] = val.bind(this);
            } else {
                this[k[i]] = val;
            }
        }
    };

    Cross.prototype.render = function(agCross, obj, locals){
        // TODO: change this?
        var locals = locals || [];
        var obj = obj || {};
        node = document.querySelector('[ag-cross="' + agCross + '"]');
        if (!node){
            console.warn('No node with ag-cross attribute set to "' + agCross + '"');
            return;
        }
        _recursiveRender(node, obj, locals.concat(this));
        node.style.display = 'block';
    };

    Cross.prototype.renderPartialForEach = function(partialId, array, elType){
        var cross = this;
        var elType = elType || 'div';
        var partial = _findPartialById(partialId);
        // make the array observable if it isn't already.
        if (typeof array !== 'function'){
            array = new observableArray(array);
        }
        var refNode = document.createComment("length: " + array().length + ", elType: " + elType);
        array.__updateRefNodeList(partialId, refNode, this, elType);
        var results = array().map(function(obj){
            var node = _copyNodeAs(partial, elType);
            _recursiveRender(node, obj, [cross]);
            return node;
        });
        results.unshift(refNode);
        return results;
    };

    (function(){
        var routesObj = {};

        Cross.prototype.addRoutes = function(addedRoutes){
            Object.keys(addedRoutes).forEach(function(key){
                routesObj[key] = addedRoutes[key].bind(this);
            });
            return routesObj;
        };

        var _crossRouter = function(){
            var routeStr = ((window.location.hash || window.location.pathname) + "").replace(/#/, '');
            var routes = Object.keys(routesObj);
            for (var i = 0; i < routes.length; i++){
                var regStr = routes[i].replace(/:[^\/]*/g, "(.*?)");
                var paramNames = routes[i].match(/:[^\/]*/g) || [];
                paramNames = paramNames.map(function(param){
                    return param.replace(/:/g,"");
                });
                if (/\)$/.test(regStr)){
                    regStr = regStr + '(/|$)';
                }
                var regEx = new RegExp(regStr);
                var match = routeStr.match(regEx) || [];
                if (match.length){
                    var paramsObj = {};
                    for (var j = 0; j < paramNames.length; j++){
                        paramsObj[paramNames[j]] = match[j + 1];
                    }
                    routesObj[routes[i]](paramsObj);
                    break;
                }
            }

        }

        Cross.prototype.startRouter = function(){
            _crossRouter();
        }

        window.addEventListener("hashchange", _crossRouter);
    })()

    

    var _findPartialById = function(partialId){
        return document.querySelector('#' + partialId) || document.querySelector('[ag-cross="' + partialId + '"]');
    }

    var _copyNodeAs = function(node, elType){
        var result = document.createElement(elType);
        var childNodes = Array.prototype.slice.call(node.cloneNode(!!"deep clone").childNodes);
        // ideally we'd put all classes and attributes onto this new node

        _mapAttributes(null, node, ['id', 'ag-cross'], [], result);

        childNodes.forEach(function(newChild){
            result.appendChild(newChild);
        });

        // TODO: add the partial ID and other classes later!!

        return result;
    };

    var _renderBeforeNode = function(insertBeforeNode, partialId, obj, elType, cross){
        var newNode = _copyNodeAs(_findPartialById(partialId), elType);
        _recursiveRender(newNode, obj, [cross]);
        insertBeforeNode.parentNode.insertBefore(newNode, insertBeforeNode);
    };

    var _recursiveRender = function(node, obj, locals){
        var locals = locals || [];
        if (node.nodeType === Node.TEXT_NODE){
            var nodeText = node.textContent;
            var varsAndFunctions = nodeText.match(/{{.*?}}/g) || [];
            if (!varsAndFunctions.length){
                return;
            }

            // 
            var contentObjects = varsAndFunctions.map(function(el){
                var sub = el.substring(2, el.length - 2).replace(/\s*/g, '');
                return _parseStringFromChain(sub, locals.concat(obj));
            });

            contentObjects = contentObjects.map(function(contentObject){
                // what are the dependencies if i refactor this? obj, contentObject, node
                return _getNodes(obj, node, contentObject)
            });

            var wrapperTextNodes = nodeText.split(/{{.*?}}/g).map(function(text){
                return document.createTextNode(text);
            });

            // once we have the arrays, we can zipper them!
            // we have wrapperTextNodes (arr1) and contentObjects (arr2)
            var replacementNodes = _zipperArrays(wrapperTextNodes, contentObjects);
            replacementNodes.forEach(function(replacement){
                node.parentNode.insertBefore(replacement, node);
            });
            node.remove();
            // so basically we replace node with a bunch of nodes?

        } else {
            _updateActions(node, obj, locals);
            _parseCondtions(node, obj, locals);
            _updateAgValueWatchers(node, obj, locals);
            _mapAttributes(obj, node, ['id', 'ag-cross'], locals);
            Array.prototype.forEach.call(node.childNodes, function(nextNode){
                _recursiveRender(nextNode, obj, locals);
            });
        }
    };

    var _updateAgValueWatchers = function(node, obj, locals){
        var property = node.getAttribute('ag-value');
        if (!property){
            return;
        }
        obj.__agGetSetter = obj.__agGetSetter || getSetter(obj);
        // once for whenever this node changes
        node.addEventListener('keyup', function(e){ 
            obj[property] = (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(e.target.nodeName) >= 0) ? e.target.value : e.target.textContent;
        });

        if (['SELECT', 'INPUT', 'TEXTAREA'].indexOf(node.nodeName) >= 0){
            var propertyName = 'value';
            obj.__agGetSetter(_updateValueAttr, property, [agDOMO(node), propertyName]);
            _updateValueAttr(agDOMO(node), propertyName, obj[property]);
        } else {
            obj.__agGetSetter(_updateNode, property, [agDOMO(node), obj]);
            _updateNode(agDOMO(node), obj, obj[property]);
        }
        
    };

    var _mapAttributes = function(obj, node, excludedAttributes, locals, newNode){
        var locals = locals || [];
        Array.prototype.forEach.call(node.attributes, function(attr){
            if (excludedAttributes.indexOf(attr.nodeName) < 0){
                var oldAttr = attr.value;
                // var obj = locals[0];
                var value = (locals.length) ? (attr.value || '').replace(/{{.*?}}/g, function(el){
                    var sub = el.substring(2, el.length - 2).replace(/\s*/g, '');
                    if (obj){
                        obj.__agGetSetter = obj.__agGetSetter || getSetter(obj);
                        // obj.__agGetSetter(_updateAttribute, sub, attr.nodeName, oldAttr, agDOMO((newNode || node)), obj);
                    }
                    var resultObj = _parseStringFromChain(sub, locals.concat(obj));
                    if (obj && typeof resultObj.value === 'function'){
                        var preGets = JSON.parse(JSON.stringify(obj.__agGetSetter.getsMap()));
                        var result = resultObj.value.call(resultObj.object, obj);

                        var postGets = obj.__agGetSetter.getsMap();
                        Object.keys(postGets).filter(function(property){
                            return postGets[property] !== preGets[property]
                        }).forEach(function(property){
                            obj.__agGetSetter(_updateAttribute, property, [attr.nodeName, oldAttr, agDOMO((newNode || node)), locals.concat(obj), obj]);
                            // obj.__agGetSetter(_updateComputedNode, property, [contentObject.value, agDOMO(newNode), obj]);
                        });
                    } else if (obj){
                        var result = resultObj.value
                        obj.__agGetSetter(_updateAttribute, sub, [attr.nodeName, oldAttr, agDOMO((newNode || node)), locals.concat(obj), obj]);
                    }
                    
                    return result;
                }) : attr.value;
                if (newNode){
                    newNode.setAttribute(attr.nodeName, value);
                } else {
                    node.setAttribute(attr.nodeName, value);
                }
                // node.setAttribute(attr.nodeName, attr.value);
            }
        });
    };



    var _getNodes = function(obj, node, contentObject){
        if (typeof contentObject.value === 'function'){
            obj.__agGetSetter = obj.__agGetSetter || getSetter(obj);
            var preGets = JSON.parse(JSON.stringify(obj.__agGetSetter.getsMap()));
            var content = contentObject.value.call(contentObject.object, obj);
            if (content instanceof Array){ // function return array
                return content;
            } else if (typeof content === 'string') { // computed
                var newNode = document.createTextNode(content);
                var postGets = obj.__agGetSetter.getsMap();
                Object.keys(postGets).filter(function(property){
                    return postGets[property] !== preGets[property]
                }).forEach(function(property){
                    obj.__agGetSetter(_updateComputedNode, property, [contentObject.value, agDOMO(newNode), obj]);
                });

                return newNode;
            }
        } else {
            var newNode = document.createTextNode(contentObject.value);
            obj.__agGetSetter = obj.__agGetSetter || getSetter(obj);
            obj.__agGetSetter(_updateNode, contentObject.key, [agDOMO(newNode), obj])
            return newNode;
        }
    };

    var _parseCondtions = function(node, obj, locals){
        var agIf = node.getAttribute('ag-if');
        if (agIf){
            var funStr = agIf.substring(0, (agIf.indexOf("(") >= 0 ? agIf.indexOf("(") : agIf.length))
            var callback = _parseStringFromChain(funStr, locals.concat(obj));

        }  
    };

    var _updateActions = function(node, obj, locals){
        var locals = locals || [];
        var actionsList = (node.getAttribute('ag-action')) ? node.getAttribute('ag-action').split(/,\s*/) : [];
        actionsList.forEach(function(action){
            try {
                var split = action.split(/\s*:\s*/);
                var eventStr = split[0];
                var fun = _parseStringFromChain(split[1], locals.concat(window)).value;
                node.removeEventListener(eventStr, _parseAction.bind(null, fun, obj));
                node.addEventListener(eventStr, _parseAction.bind(null, fun, obj));
            } catch(e) {
                console.log(e);
            }
        });
    };

    var _parseAction = function(callback, obj, event){
        event.preventDefault();
        event.stopPropagation();
        // TODO: Figure out if we still want to do the same thing: bubble until an ag-cross
        var bubble = event.target;
        if (bubble.getAttribute("ag-cross")){
            var eventTarget = agDOMO(bubble);
            callback.call(this, eventTarget, obj);
        } else {
            while (bubble && bubble.getAttribute && !bubble.getAttribute("ag-cross")){
                bubble = bubble.parentNode;
            }
            if (bubble){
                if (bubble === document){ 
                    bubble = event.target 
                }
                var eventTarget = agDOMO(bubble);
                callback.call(this, eventTarget, obj);
            }
        }

    };

    var _recursiveFlatten = function(array){
        var results = [];
        for (var i = 0; i < array.length; i++){
            if (array[i] instanceof Array){
                results = results.concat(_recursiveFlatten(array[i]));
            } else {
                results = results.concat(array[i]);
            }
        }
        return results;
    };

    var _zipperArrays = function(arr1, arr2){
        // arr1 should be the one you want first, and the longer one
        var result = arr1.map(function(el, i){
            return (!arr2[i]) ? el : [el, arr2[i]];
        });
        return _recursiveFlatten(result);
    };

    var _parseStringFromChain = function(str, chainStarts){
        // return an object, a key, and a value
        if (!chainStarts.length){
            return;
        }
        var chain = chainStarts[0];
        var parent = null;
        var paths = str.split(".");
        var i = 0;
        while ((typeof chain !== 'undefined') && (typeof chain[paths[i]] !== 'undefined') && i < paths.length){
            var parent = chain;
            chain = chain[paths[i]];
            i++;
        }
        if (i <= paths.length - 1){
            return _parseStringFromChain(str, chainStarts.slice(1));
        }

        return {
            object: parent,
            key: paths[paths.length - 1],
            value: chain
        };
    };

    var _updateValueAttr = function(domobj, propertyName, value){
        if (domobj.attr(propertyName) !== value){
            domobj.attr(propertyName, value);
        }
    }

    var _updateAttribute = function(attrName, oldString, domobj, locals, obj, value){
        var newAttr = oldString.replace(/{{.*?}}/g, function(el){
            var sub = el.substring(2, el.length - 2).replace(/\s*/g, '');
            // return _parseStringFromChain(sub, [obj]).value;
            var resultObj = _parseStringFromChain(sub, locals);
            var value = resultObj.value;
            var thisObj = resultObj.object;
            return (typeof value === 'function') ? value.call(thisObj, obj) : value;
        });
        domobj.attr(attrName, newAttr);
    };

    var _updateComputedNode = function(computedFun, domobj, obj, value){
        var newText = computedFun(obj);
        domobj.text(newText);
    };

    var _updateNode = function(domobj, obj, value){
        if (domobj.text() !== value){
            domobj.text(value);
        }  
    };

    // TODO: are the architechture problems solved?
    var getSetter = function(obj){
        var getsMap = {};

        Object.keys(obj).forEach(function(key){
            try {
                var val = obj[key]
                Object.defineProperty(obj, key, {
                    get: function(){
                        getsMap[key] = (getsMap[key]) ? getsMap[key] + 1 : 1;
                        return val;
                    }
                });
            } catch (e) {
                //
            }
            
        });
        var callbackObjects = [];
        
        var _getSetter = function(callback, property, params){
            var findCBObj = callbackObjects.filter(function(el){
                return el.callback === callback && el.property === property;
            })[0];
            if (!findCBObj){
                findCBObj = {
                    callback: callback,
                    property: property,
                    paramSets: [params]
                };
                callbackObjects.push(findCBObj);
            } else {
                findCBObj.paramSets.push(params);
            }

            var value = obj[property];
            Object.defineProperty(obj, property, {
                get: function(){
                    getsMap[property] = (getsMap[property]) ? getsMap[property] + 1 : 1;
                    return value; 
                },
                set: (function(){
                    return function(newVal){
                        value = newVal;
                        callbackObjects.filter(function(cbObj){
                            return cbObj.property === property;
                        }).forEach(function(cbObj){
                            cbObj.paramSets.forEach(function(paramSet){
                                var paramSet = paramSet.slice();
                                var thisObj = (paramSet[0] instanceof AntiGravity.Cross) ? paramSet.shift() : null;
                                paramSet.push(newVal);
                                cbObj.callback.apply(thisObj, paramSet);
                            });
                        });
                    }
                })()
            });

        };

        _getSetter.getsMap = function(){
            return getsMap;
        }

        return _getSetter;
    }

    // TODO: put var in front of this
    var observableArray = AntiGravity.observableArray = function(array){
        var collection = array.slice() || [];
        var refNodeList = [];
        /*
            TODO: Figure out if we need to store the Crosses too? Probably I assume?
                - the real question is how did I get away with not storing it before???
        */

        var _observableArray = function(){
            return collection;
        };

        var _defineIndexAccessors = function(){
            for (var i = 0; i < collection.length; i++){
                Object.defineProperty(_observableArray, i, {
                    configurable: true,
                    get: (function(index){ return function(){ return collection[index] } })(i),
                    set: (function(index){
                        return function(newVal){
                            _observableArray.splice(index, 1, newVal);
                        }
                    })(i)
                });
            }
        };

        _defineIndexAccessors();


        var _multiSibling = function(node, times){
            var sib = node;
            for (var i = 0; i < times; i++){
                sib = sib.nextSibling;
                if (sib === null){
                    return null;
                }
            }
            return sib;
        };

        var _updateArrayNodes = function(indexes, changeType){
            // TODO: add handler for callbacks that fire every time this happens
                // eg: sort every time the array changes
            if (changeType === 'added'){
                // we have the indexes that got added in, and the collection is up to date, so now the DOM needs to reflect the collection

                // so do we have to do n^3?? objects, refnodes, indexes? TODO: better algorithm
                refNodeList.forEach(function(refNodeObj){
                    // then we have to loop through the refNodes and do stuff!
                    var template = refNodeObj.template;
                    refNodeObj.refNodes.forEach(function(refNodeWithCross){
                        indexes.forEach(function(index){
                            var insertBeforeNode = _multiSibling(refNodeWithCross.refNode, index + 1);
                            var elType = refNodeWithCross.elType;
                            var cross = refNodeWithCross.cross
                            // insertBeforeNode, partialId, obj, elType, cross
                            _renderBeforeNode(insertBeforeNode, template, collection[index], elType, cross);

                        });
                    });


                });
            } else if (changeType === 'subtracted'){
                refNodeList.forEach(function(refNodeObj){

                    refNodeObj.refNodes.forEach(function(refNodeWithCross){
                        indexes.forEach(function(index, i){
                            var deletedNode = _multiSibling(refNodeWithCross.refNode, index + 1 - i);
                            deletedNode.remove();
                        });

                    });
                });

            } else if (changeType === 'reordered'){
                refNodeList.forEach(function(refNodeObj){

                    refNodeObj.refNodes.forEach(function(refNodeWithCross){
                        var orderedNodes = indexes.map(function(index){
                            return _multiSibling(refNodeWithCross.refNode, index + 1);
                        });
                        orderedNodes.forEach(function(orderedNode, i){
                            var insertAfter = _multiSibling(refNodeWithCross.refNode, i);
                            insertAfter.parentNode.insertBefore(orderedNode, insertAfter.nextSibling);
                        });

                    });
                });
            }
            _defineIndexAccessors();
        };

        _observableArray.__updateRefNodeList = function(template, refNode, cross, elType){
            var refNodeObj = refNodeList.filter(function(refNodeObj){
                return refNodeObj.template === template;
            })[0];
            var refCrossObj = {
                cross: cross,
                refNode: refNode,
                elType: elType
            };
            // I think we need the cross so we can do stuff like find its functions the user puts onto it
            if (refNodeObj){

                refNodeObj.refNodes.push(refCrossObj);
            } else {
                var newObj = {
                    template: template,
                    refNodes: [refCrossObj]
                };
                refNodeList.push(newObj);
            }


        };

        _observableArray.prototype.filter = function(){

        };

        _observableArray.prototype.map = function(){

        };

        _observableArray.splice = function(index, howMany){
            var args = Array.prototype.slice.call(arguments);
            collection.splice.apply(collection, args);
            var subtracted = [];
            for (var i = 0; i < howMany; i++){
                subtracted.push(index + i);
            }
            var addons = args.slice(2);
            var added = [];
            if (addons.length){
            
                for (var i = 0; i < addons.length; i++){
                    added.push(index + i);
                }
            }
            _updateArrayNodes(subtracted, 'subtracted');
            _updateArrayNodes(added, 'added');
        };

        _observableArray.prototype.slice = function(){

        };

        _observableArray.push = function(){
            var currentLength = collection.length;
            var indexes = [];
            Array.prototype.forEach.call(arguments, function(arg, i){
                collection.push(arg);
                indexes.push(i + currentLength);
            });
            _updateArrayNodes(indexes, 'added');
        };

        _observableArray.pop = function(){
            var result = collection.pop();
            _updateArrayNodes([collection.length], 'subtracted');
            return result;
        };

        _observableArray.prototype.shift = function(){

        };

        _observableArray.prototype.unshift = function(){

        };

        _observableArray.sort = function(comparator){
            if (!comparator){
                console.warn("Pass comparator function as argument");
                return collection; 
            }
            var oldCollection = collection.slice();
            collection.sort(comparator);
            var indexMap = [];
            var indexMap = collection.map(function(obj){
                return oldCollection.indexOf(obj);
            });
            _updateArrayNodes(indexMap, "reordered");
            return collection;
        };

        return _observableArray;
    };

    var agAJAX = AntiGravity.agAJAX = function(requestObject){
        // request object needs a type, URL, and a success callback
        // also should support: data, dataType, 
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState === 4 ) {
                if (requestObject.success && typeof requestObject.success === 'function'){
                    requestObject.success(xmlhttp.responseText);
                }
            }
        }
        xmlhttp.open((requestObject.type || "").toUpperCase() || "GET", requestObject.url, true);
        // TODO: setRequestHeader()
        xmlhttp.send(requestObject.data);
    };

    var DOMObj = function(selectorOrCollection){
        this.collection = [];
        var _result = function(){
            return collection;
        }

        if (typeof selectorOrCollection === 'string'){
            this.collection = Array.prototype.slice.call(document.querySelectorAll(selectorOrCollection));
        } else if (selectorOrCollection instanceof Array) {
            this.collection = selectorOrCollection;
        } else if (selectorOrCollection instanceof NodeList){
            this.collection = Array.prototype.slice.call(selectorOrCollection);
        } else {
            this.collection = [selectorOrCollection]
        }
    }

    DOMObj.prototype.text = function(newText){
        if (typeof newText === 'undefined'){
            var results = this.collection.map(function(node){
                return node.textContent;
            });
            return (results.length === 1) ? results[0] : results;
        } else {
            this.collection.forEach(function(node){
                node.textContent = newText;
            });
        }
        return this;
    };

    DOMObj.prototype.attr = function(attrName, attrValue){
        if (typeof attrValue === 'undefined'){
            var results = this.collection.map(function(node){
                return node.getAttribute(attrName);
            });
            return (results.length === 1) ? results[0] : results;
        } else {
            this.collection.forEach(function(node){
                node.setAttribute(attrName, attrValue);
            });
        }
        return this;
    };

    DOMObj.prototype.css = function(attrObjectOrName, attrValue){
        if (typeof attrObjectOrName === 'string' && !!attrValue){
            this.collection.forEach(function(node){
                node.style[attrObjectOrName] = attrValue;
            });
        } else if (typeof attrObjectOrName === 'string') {
            var results = this.collection.map(function(node){
                var style = window.getComputedStyle(node);
                return style[attrObjectOrName];
            });
            return (results.length === 1) ? results[0] : results;
        } else {
            var attrs = Object.keys(attrObjectOrName);
            var self = this;
            attrs.forEach(function(attr){
                self.collection.forEach(function(node){
                    node.style[attr] = attrObjectOrName[attr];
                }); 
            });
        }
        return this;
    };

    var agDOMO = AntiGravity.agDOMO = function(selectorOrCollection){
        return new DOMObj(selectorOrCollection);
    };

    var escapeHTML = AntiGravity.escapeHTML = function escapeHTML(string){
        var pre = document.createElement('pre');
        var text = document.createTextNode( string );
        pre.appendChild(text);
        return pre.innerHTML;
    }



})(this);
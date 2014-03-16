(function(root){
  //A framework so light it floats!!
  var AntiGravity = root.AntiGravity = (root.AntiGravity || {});

  var activeModels = AntiGravity.activeModels = [];
  var Model = AntiGravity.Model = function Model(object){
    this.pojos = new observableArray([]);//models
    this.pojoIDs = [];
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this[k[i]] = object[k[i]];
    }
    activeModels.push(this);    
  };

  Model.prototype.findAllWhere = function(obj){
    var keys = Object.keys(obj);
    var response = [];
    for (var i = 0; i < this.pojos().length; i++){
      var flag = true;
      for (var j = 0; j < keys.length; j++){
        if (this.pojos()[i][keys[j]] != obj[keys[j]]){
          flag = false;
          break;
        }
      }
      if (flag){
        response.push(this.pojos()[i]);
      }
    }
    return new observableArray(response);
  };

  Model.prototype.removeAllWhere = function(obj){
    var keys = Object.keys(obj);
    var rejectIds = []; var rejects = [];
    for (var i = 0; i < this.pojos().length; i++){
      var flag = true;
      for (var j = 0; j < keys.length; j++){
        if (this.pojos[i][keys[j]] != obj[keys[j]]){
          flag = false;
          break;
        }
      }
      if (flag){
        rejects.push(this.pojos[i]);
        rejectIds.push(i); 
      }
    }
    for (var i = 0; i < rejectIds.length; i++){
      this.pojos.splice(rejectIds[i], 1);
    }
    return new observableArray(rejects);
  }

  Model.prototype.hasMany = function(name, obj){
    this[name] = function(pojo){
      var params = {};
      params[obj["foreignKey"]] = pojo[obj["primaryKey"]];
      return obj["model"].findAllWhere(params);
    };
  };

  Model.prototype.belongsTo = function(name, obj){
    this[name] = function(pojo){
      var params = {};
      params[obj["primaryKey"]] = pojo[obj["foreignKey"]];
      return obj["model"].findAllWhere(params)[0];
    };
  };

  Model.prototype.urlSubstitute = function(url, obj){
    var arr = path.match(/:(.*?)(\/|$)/g) || [];
    for (var i = 0; i < arr.length; i++){
      var str = arr[i].replace(/[\/:]/g, '');
      var value = obj[str];
      url = url.replace(/:(.*?)(\/|$)/, value);
    }

    return url;
  };

  Model.prototype.parseToPojos = function(pojoOrPojos, propertyParseObject, recurse){
    var remaps = (propertyParseObject) ? Object.keys(propertyParseObject) : [];
    var pojoOrPojos = (pojoOrPojos instanceof Array) ? pojoOrPojos : [pojoOrPojos];
    for (var i = 0; i < pojoOrPojos.length; i++){
      for (var j = 0; j < remaps.length; j++){
        if (recurse === true){
          var secondArg = propertyParseObject;
        } else if (!!recurse) {
          var secondArg = recurse[remaps[j]];
        } else {
          var secondArg = null;
        }
        pojoOrPojos[i][remaps[j]] = propertyParseObject[remaps[j]].parseToPojos(pojoOrPojos[i][remaps[j]], secondArg, !!recurse);
      }
      this.pojos.push(pojoOrPojos[i]);
    }
    var result = (pojoOrPojos instanceof Array) ? new observableArray(pojoOrPojos) : pojoOrPojos;
    return result;
  };

  Model.prototype.fetchWhere = function(attrs, parse, cb, url){
    var self = this;
    $.ajax({
      type: "GET",
      url: url || this.singleURL,
      data: attrs,
      success: function(resp){
        if (parse === true){
          self.pojos.push(resp)
          self.pojoIDs.push(resp["id"])
        } else if (typeof parse === "function") {
          parse(resp);
        }
        if (cb) {
          cb();
        }
      }
    })
  };

  Model.prototype.fetchAllWhere = function(attrs, parse, cb, url){
    var keys = Object.keys(attrs);
    var self = this;
    $.ajax({
      type: "GET",
      url: url || this.allURL,
      data: attrs,
      success: function(resp){
        if (parse === true){
          if (typeof resp == "object"){
            for (var i = 0; i < resp.length; i++){
              self.pojos.push(resp[i]);
              self.pojoIDs.push(resp[i]["id"]*1)
            }
          }
        } else if (typeof parse === "function") {
          parse(resp);
        }
        if (cb){
          cb();
        }
      }
    })
  };

  Model.prototype.singleSave = function(pojo, parse, cb, url){
    var self = this;
    $.ajax({
      type:"POST",
      url: url || this.singleURL,
      data: pojo,
      success: function(resp){
        if (!!resp && parse === true){
          if (self.pojoIDs.indexOf(resp["id"]*1) >= 0){
            for (var i = 0; i < self.pojos().length; i++){
              if (self.pojos()[i]["id"]*1 == resp["id"]*1){
                self.pojos.splice(i, 1, resp);
                // self.pojos[i] = resp;
                break;
              }
            }
          } else {
            self.pojos.push(resp);
          }
        } else if (typeof parse == "function") {
          parse(resp);
        }

        if (cb){
          cb();
        }
      }
    })
  };

  Model.prototype.singleUpdate = function(pojo, parse, cb, url){
    var self = this;
    $.ajax({
      type:"PUT",
      url: url || this.singleURL,
      data: pojo,
      success: function(resp){
        if (!!resp && parse === true){
          for (var i = 0; i < self.pojos().length; i++){
            if (self.pojos[i]["id"] == resp["id"]){
              self.pojos[i] = resp;
              break;
            }
          }
        } else if (typeof parse == "function") {
          parse(resp);
        }

        if (cb){
          cb();
        }
      }
    })
  };

  Model.prototype.singleDestroy = function(pojo, parse, cb, url){
    var self = this;
    $.ajax({
      type:"DELETE",
      url: url || this.singleURL,
      data: pojo,
      success: function(resp){
        if (parse === true){
          var resp = resp || {};
          for (var i = 0; i < self.pojos().length; i++){
            if (self.pojos[i]["id"] == (resp["id"] || pojo["id"])){
              self.pojos.splice(i,1);
              break;
            }
          }
        } else if (typeof parse == "function") {
          parse(resp);
        }

        if (cb){
          cb();
        }
      }
    })
  };

  var observableArray = function(array){
    var collection = array || [];
    var refNodeList = {}
    var result = function(){
      return collection;
    };
    //this needs to get arguments like which indexes were added, which were lost

    result.updateRefNodeList = function(refNode, templateId){
      if (refNodeList[templateId]){
        refNodeList[templateId].push(refNode);
      } else {
        refNodeList[templateId] = [refNode];
      }
    };

    result._defineIndexAccessors = function(){
      for (var i = 0; i < collection.length; i++){
        Object.defineProperty(result, i, {
          configurable: true,
          get: (function(index){ return function(){ return collection[index] } })(i),
          set: (function(index){
            return function(newVal){
              console.log(index); //probably closuring wrong i
              this.splice(index, 1, newVal);
            }
          })(i)
        });
      }
    };

    result._defineIndexAccessors();

    //WHAT ABOUT: when the developer does a .remove() on one of my precious array nodes?
    //OR WHAT ABOUT: when the developer does ANY node-altering function!
    //Then how you gonna roll??
    //One thing at a time eh?
    var _multiSibling = function(node, times){
      var sib = node;
      for (var i = 0; i < times; i++){
        sib = sib.nextSibling;
        if (sib === null){
          return null;
        }
      }
      return sib;
    }

    result.updateNodes = function(indexes, action){
      var refNodes = Object.keys(refNodeList);
      if (action === "added"){ //push, shift, concat, splice
        for (var i = 0; i < indexes.length; i++){
          for (var j = 0; j < refNodes.length; j++){
            for (var k = 0; k < refNodeList[refNodes[j]].length; k++){
              var insertBeforeNode = _multiSibling(refNodeList[refNodes[j]][k], indexes[i] + 1);//refNodeList[refNodes[j]]
              //for those keeping track at home this is n^4, or should I say n^for-th
              //the good news is these things should each by 1-3 long...
              var elType = refNodeList[refNodes[j]][k].nodeValue.split(", ")[1].split(": ")[1];
              Cross.prototype.recursiveTemplateRenderInsertBefore(refNodes[j], insertBeforeNode, collection[indexes[i]], elType);
            }
            
          }
        }
      } else if (action === "subtracted"){//pop, unshift, splice
        for (var i = 0; i < indexes.length; i++){
          for (var j = 0; j < refNodes.length; j++){
            for (var k = 0; k < refNodeList[refNodes[j]].length; k++){
              var deletedNode = _multiSibling(refNodeList[refNodes[j]][k], indexes[i] + 1);
              deletedNode.remove();
            }
          }
        }
      } else if (action === "changed"){//????

      } else if (action === "reordered"){//sort
        
        for (var j = 0; j < refNodes.length; j++){
          for (var k = 0; k < refNodeList[refNodes[j]].length; k++){
            var orderedNodes = [];
            for (var i = 0; i < indexes.length; i++){ 
              // so indexes[0] is the index of the node that needs to move to the top...
              orderedNodes.push(_multiSibling(refNodeList[refNodes[j]][k], indexes[i] + 1));
            }
            for (var i = 0; i < orderedNodes.length; i++){
              var insertAfter = _multiSibling(refNodeList[refNodes[j]][k], i);
              insertAfter.parentNode.insertBefore(orderedNodes[i], insertAfter.nextSibling);
            }

          }
        }
      }
      this._defineIndexAccessors();
    };

    result.sort = function(comparator){
      if (!comparator){
        console.warn("Pass comparator function as argument");
        return collection; 
      }
      var oldCollection = collection.slice();
      collection.sort(comparator);
      var indexMap = [];
      for (var i = 0; i < collection.length; i++){
        indexMap.push(oldCollection.indexOf(collection[i]));
      }
      this.updateNodes(indexMap, "reordered");
      return collection;
    };

    result.push = function(){
      var args = Array.prototype.slice.call(arguments);
      var currentLength = collection.length;
      var indexes = [];
      for (var i = 0; i < args.length; i++){
        collection.push(args[i]);
        indexes.push(currentLength + i);
      }
      this.updateNodes(indexes, "added");
    };
    result.pop = function(){
      var value = collection.pop();
      this.updateNodes([collection.length], "subtracted");
      return value;
    };
    result.splice = function(index, howMany){
      Array.prototype.splice.apply(collection, Array.prototype.slice.call(arguments));
      var subtracted = [];
      for (var i = 0; i < howMany; i++){
        subtracted.push(index + i);
      }
      var addons = Array.prototype.slice.call(arguments, 2);
      if (addons.length){
        var added = [];
        for (var i = 0; i < addons.length; i++){
          added.push(index + i);
        }
      }
      this.updateNodes(subtracted, "subtracted");
      this.updateNodes(added, "added");
      return collection;
    };
    result.concat = function(arr){
      this.push.apply(this, arr);
    };
    result.indexOf = function(el){
      return collection.indexOf(el);
    };
    // concat (destructive), shift, unshift?
    return result;
  }

  var Cross = AntiGravity.Cross = function Cross(object){
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this[k[i]] = object[k[i]];
    }
    if (this.$routes){
      this._$routes(this.$routes);
    }
  };

  var crossRouter = function(){
    var routeStr = (window.location.hash || window.location.pathname) + "";
    routeStr = routeStr.substring(1);
    var routeStrings = Object.keys(routesObject);
    for (var i = 0; i < routeStrings.length; i++){
      var kvarr = _routeToRegExpObject(routeStrings[i], routesObject[routeStrings[i]]);
      var match = routeStr.match(kvarr[0])
      if (match && match[0] === routeStr){
        //build params and send them along in callback
        var params = {};
        for (var j = 1; j < match.length; j++){
          params[kvarr[1]["params"][j-1]] = match[j];
        }
        kvarr[1]["callback"](params);
        // if (history.pushState){
        //   history.pushState();
        // }          
      }
    }      
  };

  window.addEventListener("hashchange", crossRouter);
  var routesObject = {};

  Cross.prototype._$routes = function(els){
    var routeStrings = Object.keys(els);
    for (var i = 0; i < routeStrings.length; i++){
      routesObject[routeStrings[i]] = els[routeStrings[i]];
    }
  };

  function _routeToRegExpObject(routeStr, cb){
    var paramVars = routeStr.match(/:[^\/]*/g) || [];
    for (var i = 0; i < paramVars.length; i++){
      paramVars[i] = paramVars[i].replace(/:/g,"");
    }
    var regStr = routeStr.replace(/:[^\/]*/g, "(.*?)")
    if (regStr.match(/\(\.\*\?\)$/)){ regStr = regStr + "$"; }
    var valObj = {params: paramVars, callback: cb}
    return [new RegExp(regStr), valObj];
  }

  Cross.prototype.renderView = function(renderId, object, elType){
    var elType = elType || "render";
    var newEl = document.createElement(elType);
    if (newEl.nodeName === "RENDER"){ newEl.style.display = "block"; }
    var renderNode = document.getElementById(renderId) || elementByCross(renderId, "render");
    var childNodes = Array.prototype.slice.call(renderNode.cloneNode(true).childNodes);
    for (var i = 0; i < childNodes.length; i++){
      newEl.appendChild(childNodes[i]);
    }
    renderNode.parentNode.insertBefore(newEl, renderNode);
    this.recursiveTemplateRender(childNodes, object);
    this.triggerRenderEvents(newEl);
  };

  Cross.prototype.recursiveTemplateRender = function(nodesArr, object){
    var obj = object || window;
    for (var i = 0; i < nodesArr.length; i++){
      if (nodesArr[i].nodeType === Node.TEXT_NODE){
        var arr = nodesArr[i].textContent.match(/{{.*?}}/g) || [];
        for (var j = 0; j < arr.length; j++){
          var sub = arr[j].substring(2,arr[j].length-2).replace(/\s*/g, '');
          var kvarr = parseStringToProperty(sub, obj);
          var content = kvarr[1];
          if (typeof content === "undefined" && !!this[sub]){
            var newNodes = this[sub](object);
          } else {
            var newNodes = [document.createTextNode(content || "")];
          }          
          if (!kvarr[0].AntiGravityGS){
            kvarr[0].AntiGravityGS = GetSetter(kvarr[0]);
          } 
          kvarr[0].AntiGravityGS(newNodes, sub.split(".")[sub.split(".").length - 1]);
          arr[j] = newNodes;
        }
        var arr2 = nodesArr[i].textContent.split(/{{.*?}}/g);
        
        for (var j = 0; j < arr2.length; j++){
          nodesArr[i].parentNode.insertBefore(document.createTextNode(arr2[j]), nodesArr[i]);
          if (arr[j]){ 
            for (var k = 0; k < arr[j].length; k++){
              nodesArr[i].parentNode.insertBefore(arr[j][k], nodesArr[i]);
            }               
          }
        }
        nodesArr[i].remove();
      } else {
        this.updateActions(nodesArr[i], obj);
        this.parseConditions(nodesArr[i], obj);
        this.recursiveTemplateRender(Array.prototype.slice.call(nodesArr[i].childNodes), obj);
      }
    }
  };

  Cross.prototype.recursiveTemplateRenderInsertBefore = function(partialId, insertBeforeNode, object, elType){
    var template = document.getElementById(partialId) || elementByCross(partialId);
    var originalChildren = Array.prototype.slice.call(template.childNodes);
    var clonedChildren = [];
    var newEl = document.createElement(elType || "div");
    for (var i = 0; i < originalChildren.length; i++){
      clonedChildren.push(originalChildren[i].cloneNode(true));
      newEl.appendChild(clonedChildren[i]);
    }
    
    insertBeforeNode.parentNode.insertBefore(newEl, insertBeforeNode);
    this.recursiveTemplateRender(clonedChildren, object);
  };

  Cross.prototype.renderPartialForEach = function(partialId, array, elType){
    if (typeof array !== "function"){
      var array = new observableArray(array);
    }
    var template = document.getElementById(partialId) || elementByCross(partialId);
    var refNode = document.createComment("length: " + array().length + ", elType: " + elType);
    array.updateRefNodeList(refNode, partialId);
    var originalChildren = Array.prototype.slice.call(template.childNodes);
    var results = [refNode];
    for (var j = 0; j < array().length; j++){        
      var clonedChildren = [];
      var newEl = document.createElement(elType || "div");
      for (var i = 0; i < originalChildren.length; i++){
        clonedChildren.push(originalChildren[i].cloneNode(true));
        newEl.appendChild(clonedChildren[i]);
      }
      results.push(newEl);
      this.recursiveTemplateRender([newEl], array()[j])
    }
    
    return results;      
  };

  function elementByCross(partialId, elType){
    var elType = elType || "partial"
    var partials = Array.prototype.slice.call(document.getElementsByTagName(elType));
    for (var i = 0; i < partials.length; i++){
      if (partials[i].getAttribute("ag-cross") === partialId){
        return partials[i];
      }
    }
    return null
  };

  var makeUnique = function(arr){ //or filter when it becomes standard
     results = [];
     for(var i = 0; i < arr.length; i++){
        if(results.indexOf(arr[i]) < 0){
          results.push(arr[i]);
        }
     }
     return results;
  };

  Cross.prototype.triggerRenderEvents = function(el){
    var actionSelect = Array.prototype.slice.call(el.querySelectorAll("[ag-action]"));
    var ifSelect = Array.prototype.slice.call(el.querySelectorAll("[ag-if]"));
    var actionables = makeUnique(actionSelect.concat(ifSelect));
    for (var i = 0; i < actionables.length; i++){
      try{
        var renderEvent = new Event('render');
      } catch(e){
        var renderEvent = document.createEvent('Event');
        renderEvent.initEvent('render', true, true);
      }
      actionables[i].dispatchEvent(renderEvent);
    }
  };

  //this isn't quite right!!
  Cross.prototype.parseConditions = function(el, obj){
    if (el.getAttribute && el.getAttribute("ag-if")){
      var cb = parseStringToProperty(el.getAttribute("ag-if"))[1];
      cb(agDOMO(el));
    }
  };

  Cross.prototype.parseAction = function(cb, obj, event){
    event.preventDefault();
    event.stopPropagation();
    var bubble = event.target;
    if (bubble.getAttribute("ag-cross")){
      var eventTarget = agDOMO(bubble);
      cb.call(this, eventTarget, obj);
    } else {
      while (bubble && bubble.getAttribute && !bubble.getAttribute("ag-cross")){
        bubble = bubble.parentNode;
      }
      if (bubble){
        var eventTarget = agDOMO(bubble);
        cb.call(this, eventTarget, obj);
      }
    }
  };

  Cross.prototype.updateActions = function(el, obj){
    if (!el.getAttribute){
      return;
    }
    var actionsList = (el.getAttribute('ag-action') && el.getAttribute('ag-action') != "") ? el.getAttribute('ag-action').split(",") : [];
    if (el.getAttribute('ag-if')){
      var str = "render: " + el.getAttribute('ag-if');
      actionsList.push(str);
    }
    for (var j = 0; j < actionsList.length; j++){
      try{
        var funStr = actionsList[j].split(/^.*\:\s*/)[1];
        var eventStr = actionsList[j].split(":")[0].replace(/\s*/g,'');
        var fun = parseStringToProperty(funStr)[1];
        el.removeEventListener(eventStr, this.parseAction.bind(this, fun, obj));
        el.addEventListener(eventStr, this.parseAction.bind(this, fun, obj));
      } catch(e){
        console.log(e);
      }
    }    
  };

  function parseStringToProperty(str, chain){
    var chain = chain || window;
    var paths = str.split(".");
    var i = 0;
    while (chain[paths[i]] && i < paths.length - 2){
      chain = chain[paths[i]];
      i++;
    }
    var obj = (paths[i + 1]) ? chain[paths[i]] : chain;
    var prop = (paths[i+ 1]) ? chain[paths[i]][paths[i+1]] : chain[paths[i]]
    return [obj, prop];
  };

  function GetSetter(obj){
    var nodeListObj = {};
    var obj = obj;
    var _getSetter = function(nodes, property){
      nodeListObj[property] = (nodeListObj[property]) ? nodeListObj[property] : [];
      nodeListObj[property] = nodeListObj[property].concat(nodes);        

      // nodeListObj[property] = (nodeListObj[property]) ? nodeListObj[property].concat(node) : [node];
      var nodeListArray = nodeListObj[property];
      // nodeListArray.push(node);
      var value = obj[property];
      Object.defineProperty(obj, property, {
        get: function() { return value; },
        set: (function(){
          return function(newVal){
            value = newVal;
            for (var i = 0; i < nodeListArray.length; i++){
              nodeListArray[i].textContent = value;
              Cross.parseConditions(nodeListArray[i].parentNode);
            }
          };
        })()
      })
    };

    return _getSetter;
  };

  var parseMarkup = function(str, params){
    var params = params || {}
    var repObj = {
      a: '|a\\s+href=\\"' + (params["a"] == true ? "" : escapeRegExp(params["a"])) + '(.*?)\\"#',
      img: '|img\\s+src=\\"' + (params["img"] == true ? "" : escapeRegExp(params["img"])) + '(.*?)\\"(.*?)#',
      iframe: '|iframe\\s+(.*?)src=\\"' + (params["iframe"] == true ? "" : escapeRegExp(params["iframe"])) + '(.*?)\\"\\s+(.*?)#'
    }
    var regExInternal = '&lt;(b|i|u|ul|ol|li|br|br\\s\\/|p#)&gt;';
    var closingRegEx = new RegExp("&lt;\/(b|i|u|ul|ol|li|p|a|iframe)&gt;","g");
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++){
      regExInternal = regExInternal.replace("#", repObj[keys[i]]);
    }
    regExInternal = regExInternal.replace("#", "");
    var regEx = new RegExp(regExInternal, "g");
    var result = str.replace(regEx, function(a,b){ if (b.split(/src\s*=\s*/).length <= 2){ return "<" + b + ">"; } else { return "" } });
    result = result.replace(closingRegEx, "<\/$1>");
    var dummyEl = document.createElement("div");
    dummyEl.innerHTML = result;
    return Array.prototype.slice.call(dummyEl.childNodes);
  }

  function escapeRegExp(str) {
    var str = str || "";
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  };

  var DOMObj = function(input, attrType, delimeter, node){
    var attrType = (attrType) ? attrType : "class";
    var delimeter = (delimeter) ? delimeter : " ";
    var node = (node) ? node : document;
    this.collection = (function(input){
      if (input.nodeName){
        return [input];
      } else if (input.nextNode){
        return Array.prototype.slice.call(input);
      } else {
        //refactored this "else" block
        var arr = input.split(" ");
        var nexts = [];
        for (var i = 0; i < arr.length; i++){
          if (arr[i].indexOf("#") >= 0){ 
            var nexts = [document.getElementById(arr[i].split("#")[1])] 
          } else if (arr[i].indexOf(".") >= 0){
            //refactored this "else if" block
            var newNexts = [];
            if (nexts.length){ //if we have parent elements
              for (var j = 0; j < nexts.length; j++){
                var possibles = Array.prototype.slice.call(nexts[j].getElementsByTagName(arr[i].split(".")[0] || "*"));
                for (var k = 0; k < possibles.length; k++){ //now see if they have the right class
                  if (possibles[k].getAttribute && (possibles[k].getAttribute(attrType) || "").split(delimeter).indexOf(arr[i].split(".")[1]) >= 0){
                    newNexts.push(possibles[k]);
                  }
                }
              }
            } else { //no parent elements to work from, so go through entire document
              var possibles = Array.prototype.slice.call(node.getElementsByTagName(arr[i].split(".")[0] || "*"));
              for (var k = 0; k < possibles.length; k++){
                if (possibles[k].getAttribute && possibles[k].getAttribute(attrType)){
                  if (possibles[k].getAttribute(attrType).split(delimeter).indexOf(arr[i].split(".")[1]) >= 0){
                    newNexts.push(possibles[k]);
                  }                      
                }
              }
            }
            nexts = newNexts;
            if (!nexts.length){ break; }
          } else { 
            //refactored this else block 
            var newNexts = [];
            if (nexts.length){                  
              for (var j = 0; j < nexts.length; j++){
                newNexts = newNexts.concat(Array.prototype.slice.call(nexts[j].getElementsByTagName(arr[i])));
              }
            } else {
              newNexts = newNexts.concat(Array.prototype.slice.call(node.getElementsByTagName(arr[i])));
            }
            nexts = newNexts;
            if (!nexts.length){ break; }
          }
        }
        return nexts;
      }
    })(input)
  };
  DOMObj.prototype.attr = function(name, value){
    if (this.collection.length == 1){
      if (value){
        this.collection[0].setAttribute(name, value);
        return this;
      } else {
        return this.collection[0].getAttribute(name);
      }
    } else {
      var results = [];
      for (var i = 0; i < this.collection.length; i++){
        if (value){
          this.collection[i].setAttribute(name, value);
        } else {
          results.push(this.collection[i].getAttribute(name));
        }
      }
      if (value){
        return this;
      } else {
        return results;
      }
    }
  };
  DOMObj.prototype.toggleClass = function(values){
    for (var i = 0; i < this.collection.length; i++){
      var classes = (this.collection[i].getAttribute("class") || "").split(" ");
      for (var j = 0; j < values.length; j++){
        if (classes.indexOf(values[j]) >= 0){
          var classIndex = classes.indexOf(values[j]);
          var valueIndex = j;
          break;
        }
      }
      if (this.collection[i].getAttribute("class")){//classes[0] = values[]
        valueIndex = (valueIndex || valueIndex === 0) ? valueIndex : -1;
        classes[(classIndex || classIndex === 0) ? classIndex : classes.length] = values[(valueIndex + 1) % values.length];
      } else {
        classes[0] = values[0];
      }          
      this.collection[i].setAttribute("class", classes.join(" "));
    }

    return this;
  };
  DOMObj.prototype.toggleCSS = function(property, values){
    for (var i = 0; i < this.collection.length; i++){
      var current = this.collection[i].style[property];
      var currentIndex = values.indexOf(current);
      this.collection[i].style[property] = values[(currentIndex + 1) % values.length];
    }
    return this;
  };
  DOMObj.prototype.toggleText = function(values){
    for (var i = 0; i < this.collection.length; i++){
      var current = this.collection[i].innerText;
      var currentIndex = values.indexOf(current);
      this.collection[i].innerText = values[(currentIndex + 1) % values.length];
    }
  };
  DOMObj.prototype.findNearByCross = function(tagname, explicitCross){
    //launches from 1st object in collection only
    var tagname = tagname || "";
    var explicitCross = explicitCross || this.collection[0].getAttribute("ag-cross");
    var result = agDOMO(tagname + "." + explicitCross, "ag-cross", ", ", this.collection[0].parentNode);
    if (result.collection[0] === this.collection[0]){
      result.collection = [result.collection[1]];
    } else {
      result.collection = [result.collection[0]];
    }
    return result;
    //now what? siblings are in .parentNode.childNodes is that what they wanted though?
  };
  //maybe this cross finding thing should take like an array []

  var agDOMO = AntiGravity.agDOMO = function(els, attrType, delimeter, node){
    return new DOMObj(els, attrType, delimeter, node);
  };

  var originalRenders = AntiGravity.originalRenders = {};

  var renders = document.getElementsByTagName("render");
  var partials = document.getElementsByTagName("partial");
  for (var i = 0; i < renders.length; i++){
    renders[i].style.display = "none";
    AntiGravity.originalRenders[renders[i].getAttribute("id") || renders[i].getAttribute("ag-cross")] = renders[i].cloneNode(true);
  }
  for (var i = 0; i < partials.length; i++){
    partials[i].style.display = "none";
  }

  var escapeHTML = AntiGravity.escapeHTML = function escapeHTML(string){
    var pre = document.createElement('pre');
    var text = document.createTextNode( string );
    pre.appendChild(text);
    return pre.innerHTML;
  }

})(this);
(function(root){
  //A framework so light it floats!!
  var AntiGravity = root.AntiGravity = (root.AntiGravity || {});

  var activeModels = AntiGravity.activeModels = [];
  var Model = AntiGravity.Model = function Model(object){
    this.pojos = [];//models
    this.pojoIDs = [];
    this.updated = [];
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this[k[i]] = object[k[i]];
    }
    activeModels.push(this);    
  };

  Model.prototype.findAllWhere = function(obj){
    var keys = Object.keys(obj);
    var response = [];
    for (var i = 0; i < this.pojos.length; i++){
      var flag = true;
      for (var j = 0; j < keys.length; j++){
        if (this.pojos[i][keys[j]] != obj[keys[j]]){
          flag = false;
          break;
        }
      }
      if (flag){
        response.push(this.pojos[i]);
      }
    }
    return response;
  };

  Model.prototype.removeAllWhere = function(obj){
    var keys = Object.keys(obj);
    var results = []; var rejects = [];
    for (var i = 0; i < this.pojos.length; i++){
      var flag = true;
      for (var j = 0; j < keys.length; j++){
        if (this.pojos[i][keys[j]] != obj[keys[j]]){
          flag = false;
          break;
        }
      }
      if (!flag){
        results.push(this.pojos[i]);
      } else {
        rejects.push(this.pojos[i]);
      }
    }
    this.pojos = results;
    return rejects
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
  }

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
        } else if (typeof parse == "function") {
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
              self.pojos[self.pojos.length] = resp[i];
              self.pojoIDs.push(resp[i]["id"]*1)
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

  Model.prototype.singleSave = function(pojo, parse, cb, url){
    var self = this;
    $.ajax({
      type:"POST",
      url: url || this.singleURL,
      data: pojo,
      success: function(resp){
        if (!!resp && parse === true){
          if (self.pojoIDs.indexOf(resp["id"]*1) >= 0){
            for (var i = 0; i < self.pojos.length; i++){
              if (self.pojos[i]["id"]*1 == resp["id"]*1){
                self.pojos[i] = resp;
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
          for (var i = 0; i < self.pojos.length; i++){
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
          for (var i = 0; i < self.pojos.length; i++){
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

  var Cross = AntiGravity.Cross = function Cross(object){
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this[k[i]] = object[k[i]];
    }
  };

  Cross.prototype.renderPartialOnce = function(id, elType, object){
    var object = object || {};
    var template = object.template || document.getElementById(id);
    var el = document.createElement(elType);
    attrs = template.attributes;
    for (var i = 0; i < attrs.length; i++){
      if (attrs[i].nodeName != "id" && attrs[i].nodeName != "style"){
        el.setAttribute(attrs[i].nodeName, attrs[i].nodeValue);
      }
    }
    var anotherClass = id;
    var otherClasses = el.getAttribute("class") || "";
    el.setAttribute("class", (otherClasses) ? otherClasses + " " + anotherClass : anotherClass);
    el.innerHTML = template.innerHTML;
    getSetter(object, el, template, this);
    el = this.recursiveRenderPartial(el, object);
    return [el];
  };

  Cross.prototype.renderPartialForEach = function(id, array, elType){
    var els = [];
    for (var j = 0; j < array.length; j++){
      var object = array[j];
      var template = object.template || document.getElementById(id);
      var el = document.createElement(elType);
      attrs = template.attributes;
      for (var i = 0; i < attrs.length; i++){
        if (attrs[i].nodeName != "id" && attrs[i].nodeName != "style"){
          el.setAttribute(attrs[i].nodeName, attrs[i].nodeValue);
        }
      }
      var anotherClass = id;
      var otherClasses = el.getAttribute("class") || "";
      el.setAttribute("class", (otherClasses) ? otherClasses + " " + anotherClass : anotherClass);
      el.innerHTML = template.innerHTML;
      getSetter(object, el, template, this);
      els.push(this.recursiveRenderPartial(el, object));
    }
    var dummyEl = document.createElement("div");
    for (var i = 0; i < els.length; i++){
      dummyEl.appendChild(els[i]);
    }
    return dummyEl.childNodes;
  };

  Cross.prototype.renderPartialAtTarget = function(target, id, object, elType){
    var template = document.getElementById(id);
    var el = document.createElement(elType);
    attrs = template.attributes;
    for (var i = 0; i < attrs.length; i++){
      if (attrs[i].nodeName != "id" && attrs[i].nodeName != "style"){
        el.setAttribute(attrs[i].nodeName, attrs[i].nodeValue);
      }
    }
    el.innerHTML = template.innerHTML;
    // getSetter(object, el, template, this);
    el = this.recursiveRenderPartial(el, object);
    // target.innerHTML = "";
    while (target.firstChild){ target.removeChild(target.firstChild); }
    target.appendChild(el);
    return agDOM(target, object);
  };

  Cross.prototype.updateTarget = function(target, object, template){
    var el = document.createElement(target.nodeName);
    el.innerHTML = template.innerHTML;
    el = this.recursiveRenderPartial(el, object);
    // target.innerHTML = "";
    while (target.firstChild){ target.removeChild(target.firstChild); }
    children = el.childNodes;
    children = Array.prototype.slice.call(children,0);
    for (var i = 0; i < children.length; i++){
      target.appendChild(children[i]);
    }
    this.triggerRenderEvents(target);
    return target;
  }

  Cross.prototype.renderView = function(renderId, elType){
    var rend = document.getElementById(renderId);
    if (!rend){
      var t = document.getElementsByTagName("render");
      for (var i = 0; i < t.length; i++){
        if (t[i].getAttribute("ag-cross") == renderId){
          rend = t[i];
          break;
        }
      }
    }
    var template = AntiGravity.originalRenders[renderId].cloneNode(true);
    var el = this.recursiveRender(template);
    
    template.style.display = "block";
    rend.parentNode.replaceChild(el, rend);
    this.triggerRenderEvents(template);
  };

  Cross.prototype.unrenderAll = function(exceptions){
    var exceptions = exceptions || [];
    var keys = Object.keys(AntiGravity.originalRenders);
    for (var i = 0; i < keys.length; i++){
      if (exceptions.indexOf(keys[i]) == -1){
        var renderId = keys[i];
        var rend = document.getElementById(renderId);
        if (!rend){
          var t = document.getElementsByTagName("render");
          for (var i = 0; i < t.length; i++){
            if (t[i].getAttribute("ag-cross") == renderId){
              rend = t[i];
              break;
            }
          }
        }
        rend.parentNode.replaceChild(AntiGravity.originalRenders[renderId], rend);
      }      
    }
  };
  Cross.prototype.unrenderView = function(renderId){
    var rend = document.getElementById(renderId);
    if (!rend){
      var t = document.getElementsByTagName("render");
      for (var i = 0; i < t.length; i++){
        if (t[i].getAttribute("ag-cross") == renderId){
          rend = t[i];
          break;
        }
      }
    }
    rend.parentNode.replaceChild(AntiGravity.originalRenders[renderId], rend);
  };

  Cross.prototype.recursiveRender = function(parentEl){
    var childs = parentEl.childNodes;
    var children = Array.prototype.slice.call(childs);
    if (children.length == 0){
      return parentEl;
    }
    
    var results = [];
    for (var j = 0; j < children.length; j++){
      if (children[j].nodeType == Node.TEXT_NODE){
        var val = children[j].nodeValue;
        var arr = val.match(/{{(.*?)}}/g) || [];
        var arr2 = val.replace(/{{(.*?)}}/g,"$#%$#%").split("$#%$#%");
        for (var i = 0; i < arr.length; i++){
          var sub = arr[i].substring(2,arr[i].length-2);
          var rep = sub.replace(/\s+/g, '');
          var insert = this[rep];
          arr[i] = (typeof insert == "function") ? insert.call(this) : insert;
        }
        for (var i = 0; i < arr2.length; i++){
          results.push(document.createTextNode(arr2[i]));
          if (arr[i] || arr[i] == 0){
            if (typeof arr[i] == "string"){
              results.push(document.createTextNode(arr[i]));
            } else {
              var nodes = Array.prototype.slice.call(arr[i],0);
              for (var k = 0; k < nodes.length; k++){
                results.push(nodes[k]);
              }
            }
          }
        }
      } else {
        results.push(this.recursiveRender(children[j]));
      }
    }
    // parentEl.innerHTML = "";
    while (parentEl.firstChild){ parentEl.removeChild(parentEl.firstChild); }
    for (var i = 0; i < results.length; i++){
      parentEl.appendChild(results[i]);
    }
    return parentEl;
  }

  Cross.prototype.recursiveRenderPartial = function(parentEl, object){
    var childs = parentEl.childNodes;
    var children = Array.prototype.slice.call(childs);
    if (children.length == 0){
      this.updateActions(parentEl, object);
      return parentEl;
    }
    var agMarkup = parentEl.getAttribute("ag-markup");
    if (!!agMarkup){
      var allowences = agMarkup.split(/,\s*/);
      var agMarkupObj = {};
      for (var i = 0; i < allowences.length; i++){
        agMarkupObj[allowences[i].split(/:\s*/)[0]] = allowences[i].split(": ")[1];
      }
    }
    var results = [];
    for (var j = 0; j < children.length; j++){
      if (children[j].nodeType == Node.TEXT_NODE){        
        var val = children[j].nodeValue;
        var arr = val.match(/{{(.*?)}}/g) || [];
        var arr2 = val.replace(/{{(.*?)}}/g,"$#%$#%").split("$#%$#%");
        for (var i = 0; i < arr.length; i++){
          var sub = arr[i].substring(2,arr[i].length-2);
          var rep = sub.replace(/\s+/g, '');
          var insert = object[rep];
          arr[i] = (typeof insert == "function") ? insert.call(object) : insert + "";
          arr[i] = (arr[i] == "undefined" && typeof this[rep] == "function") ? this[rep](object) : arr[i];
        }
        for (var i = 0; i < arr2.length; i++){
          results.push(document.createTextNode(arr2[i]));
          if (arr[i]){
            if (typeof arr[i] == "string"){
              results = (agMarkup) ? results.concat(parseMarkup(escapeHTML(arr[i]), agMarkupObj)) : results.concat([document.createTextNode(arr[i])]);
              // results.push(document.createTextNode(arr[i]));
            } else {
              var nodes = Array.prototype.slice.call(arr[i],0);
              for (var k = 0; k < nodes.length; k++){
                results.push(nodes[k]);
              }
            }
          }
        }
      } else {
        results.push(this.recursiveRenderPartial(children[j], object));
      }
    }
    // parentEl.innerHTML = "";
    while (parentEl.firstChild){ parentEl.removeChild(parentEl.firstChild); }
    for (var i = 0; i < results.length; i++){
      parentEl.appendChild(results[i]);
    }
    this.updateActions(parentEl, object);
    return parentEl;
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
  }

  Cross.prototype.parseConditions = function(el, obj){
    var children = el.childNodes;
    var flag = false;
    for (var i = 0; i < children.length; i++){
      if (children[i].getAttribute && children[i].getAttribute("ag-if")){
        flag = true;
        var cb = parseStringToFunction(children[i].getAttribute("ag-if"));
        cb(agDOM(children[i], obj), obj); //this needs to change, but may be dependent on the AGDOMO upgrade
      }
    }  
  }

  function getSetter(obj, target, template, cross){
    obj["template"] = obj["template"] || template;
    var keys = Object.keys(obj);
    keys.splice(keys.indexOf("template"), 1);
    for (var i = 0; i < keys.length; i++){
      var holder = obj[keys[i]];
      (function(){
        var propVal = holder;
        Object.defineProperty(obj, keys[i], {
          get: function() { return propVal; },
          set: (function(target){
            return function(newVal){
              propVal = newVal;
              // obj[keys[i]] = holder;
              var updatedTarget = cross.updateTarget(target, obj, obj["template"]);
              cross.parseConditions(updatedTarget, obj);
            };
          })(target)
        })
      })()
    }
    return obj;
  }

  function parseStringToFunction(str){
    var chain = window;
    var paths = str.split(".");
    var i = 0;
    while (chain[paths[i]] && i < paths.length - 1){
      chain = chain[paths[i]];
      i++;
    }
    return chain[paths[i]];
  }

  Cross.prototype.parseAction = function parseAction(cb, obj, event){
    event.preventDefault();
    event.stopPropagation();
    var bubble = event.target;
    if (bubble.getAttribute("ag-cross")){
      var eventTarget = agDOM(bubble, obj);
      cb.call(this, eventTarget, obj);
    } else {
      while (bubble && bubble.getAttribute && !bubble.getAttribute("ag-cross")){
        bubble = bubble.parentNode;
      }
      if (bubble){
        var eventTarget = agDOM(bubble, obj);
        cb.call(this, eventTarget, obj);
      }
    }

  };

  Cross.prototype.updateActions = function updateActions(el, obj){
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
        var fun = parseStringToFunction(funStr);
        // el["on" + eventStr] = this.parseAction.bind(this, fun, obj);
        el.removeEventListener(eventStr, this.parseAction.bind(this, fun, obj));
        el.addEventListener(eventStr, this.parseAction.bind(this, fun, obj));
      } catch(e){
        console.log(e);
      }
    }    
  };

  function reviseTemplate(element, template, agId){
    //should make this recursive for the childNodes of the template!
    var t = (document.body.contains(template)) ? template.cloneNode(true) : template;
    var children = Array.prototype.slice.call(t.childNodes);
    var newChildren = [];
    var tester = element.cloneNode();
    var flag = false;
    for (var i = 0; i < children.length; i++){
      if (tester.isEqualNode(children[i].cloneNode())){
        var tester = element.cloneNode(true);
        tester.innerHTML = children[i].innerHTML;
        tester.setAttribute("ag-id", agId);
        newChildren.push(tester);
        flag = true;
      } else {
        newChildren.push(children[i]);
      }
    }
    if (flag){
      // t.innerHTML = "";
      while (t.firstChild){ t.removeChild(t.firstChild); }
      for (var i = 0; i < newChildren.length; i++){
        t.appendChild(newChildren[i]);
      }
      return t;
    }
    return template;
  };

  function updateTemplateByAGID(template, agId, element, options){
    var options = options || {};
    //innerText/innerHTML replacement?
    var possibles = template.querySelectorAll("[ag-id]");
    for (var i = 0; i < possibles.length; i++){
      if (possibles[i].getAttribute("ag-id") == agId){
        if (options["destroy"] === true){
          possibles[i].parentNode.removeChild(possibles[i]);
          break;
        } else {
          // possibles[i] = element;
          var newChild = element.cloneNode(true);
          if (!options["text"]){ newChild.innerHTML = possibles[i].innerHTML; }
          possibles[i].parentNode.replaceChild(newChild, possibles[i]);
          break;
        }        
      }
    }
  };

  var parseMarkup = function(str, params){
    //this needs to be modified to split up the string into multiple nodes.
    //so it will have to be concat-ed
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
    // return result;
  }

  function escapeRegExp(str) {
    var str = str || "";
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  var activeElements = {};
  var AGDOMO = function(els, obj){
    //this.element = els;//in case we just want one element
    var self = this;
    if (els instanceof Array || els instanceof NodeList){
      this.collection = Array.prototype.slice.call(els,0);
    } else {
      this.collection = [els];
    }
    this.linkers = (function(){
      var linkers = [];
      for (var i = 0; i < self.collection.length; i++){
        var crossStr = self.collection[i].getAttribute("ag-cross") || "";
        var crossArr = crossStr.split(",");
        for (var j = 0; j < crossArr.length; j++){
          if (crossArr[j]){
            linkers.push(crossArr[j].replace(/\s*/g,""));
          }
        }
      }
      return linkers;
    })();
    var agId = this.collection[0].getAttribute("ag-id");
    if (agId && activeElements[agId]){
      activeElements[agId] = this;
      obj["template"] = reviseTemplate(this.collection[0], obj["template"], agId);
    } else {
      agId = Object.keys(activeElements).length;
      activeElements[agId] = this;
      obj["template"] = reviseTemplate(this.collection[0], obj["template"], agId);
      this.collection[0].setAttribute("ag-id", agId);    
    }
    this.class = (function(){ return self.collection[0].getAttribute("class") })();
    this.value = (function(){ return self.collection[0].value })();
    this.text = (function(){ return self.collection[0].innerText; })();
    this.html = (function(){ return self.collection[0].innerHTML; })();
    this.agId = agId;
    this.obj = obj;
    return this;
  };
  AGDOMO.prototype.sibling = function(options){
    var link = (options && options["cross"]) ? options["cross"] : this.linkers[0];
    var options = options || {};
    var target = this.collection[0];
    var possibles = target.parentNode.childNodes;
    for (var i = 0; i < possibles.length; i++){
      if (possibles[i].nodeName != "#text" && (possibles[i].getAttribute("ag-cross") || "").split(", ").indexOf(link) >= 0 && possibles[i] != target){
        if ((!options["type"] || options["type"].toUpperCase == possibles[i].nodeName) && (!options["name"] || options["name"] == possibles[i].getAttribute("name"))){
          var sibling = possibles[i];
          break;
        }        
      }
    }
    if (!sibling){
      return null;
    }
    if (arguments[0] === true || arguments[1] === true){
      return agDOM(sibling, this.obj);
    } else {
      return sibling;
    }
  };
  AGDOMO.prototype.toggleCSS = function(prop, values, forceIndex){
    for (var i = 0; i < this.collection.length; i++){
      var current = this.collection[i].style[prop];
      var idx = values.indexOf(current);
      var valIndex = (typeof forceIndex == "number") ? forceIndex : (idx + 1) % values.length;
      this.collection[i].style[prop] = values[valIndex];
    }
    updateTemplateByAGID(this.obj["template"], this.agId, this.collection[0]);
    return this;
  };
  AGDOMO.prototype.toggleAttribute = function(attr, values, separator, forceIndex){
    var separator = separator || " ";
    var current = this.collection[0].getAttribute(attr) || "";
    var arr = (current.split(separator).length > 1) ? current.split(separator) : [current];
    var idx = -1;
    for (var i = 0; i < arr.length; i++){
      if (idx == -1 && values.indexOf(arr[i]) >= 0){
        idx = values.indexOf(arr[i]);
        var spliceIdx = i;
        break;
      }
    }
    if (idx >= 0 ){ arr.splice(spliceIdx, 1); }
    var valIndex = (typeof forceIndex == "number") ? forceIndex : (idx + 1) % values.length;
    if (arr.length == 1 && arr[0] == ""){ 
      arr[0] = values[valIndex] 
    } else { 
      arr.push(values[valIndex]); 
    }
    this.collection[0].setAttribute(attr, arr.join(separator));
    return this;
  }
  AGDOMO.prototype.toggleText = function(values, forceIndex){
    for (var i = 0; i < this.collection.length; i++){
      var current = this.collection[i].innerText;
      var idx = values.indexOf(current);
      var valIndex = (typeof forceIndex == "number") ? forceIndex : (idx + 1) % values.length;
      this.collection[i].innerText = values[valIndex];
    }
    updateTemplateByAGID(this.obj["template"], this.agId, this.collection[0], {text: true});
    return this;
  };
  AGDOMO.prototype.parseMarkup = function(){
    var agMarkup = this.collection[0].getAttribute("ag-markup");
    if (agMarkup.split(": ").length > 1){
      var obj = {}
      var arr = agMarkup.split(/,\s*/);
      for (var i = 0; i < arr.length; i++){
        obj[arr[i].split(/:\s*/)[0]] = arr[i].split(/:\s*/)[1]
      }
    } else {
      var obj = {};
    }
    var str = this.collection[0].innerHTML.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    var children = parseMarkup(str, obj);
    // this.collection[0].innerHTML = "";
    while (this.collection[0].firstChild){ this.collection[0].removeChild(this.collection[0].firstChild); }
    for (var i = 0; i < children.length; i++){
      this.collection[0].appendChild(children[i]);
    }
    return this;
  }
  AGDOMO.prototype.toggleHTML = function(values, forceIndex){
    for (var i = 0; i < this.collection.length; i++){
      var current = this.collection[i].innerText;
      var idx = values.indexOf(current);
      var valIndex = (typeof forceIndex == "number") ? forceIndex : (idx + 1) % values.length;
      this.collection[i].innerHTML = values[valIndex];
    }
    updateTemplateByAGID(this.obj["template"], this.agId, this.collection[0]);
    return this;
  };
  AGDOMO.prototype.textToTime = function(){
    var seconds = this.collection[0].innerText * 1;
    var txt = "";
    if (seconds <= 1){ txt = "a second"; }
    else if (seconds < 60){ txt = seconds.toString().split(".")[0] + " seconds"; }
    else if (seconds < 120){ txt = "a minute"; }
    else if (seconds < 3600){ txt = (seconds/60).toString().split(".")[0] + " minutes"; }
    else if (seconds < 7200){ txt = "an hour"; }
    else if (seconds < 86400){ txt = (seconds/(60*60)).toString().split(".")[0] + " hours"; }
    else if (seconds < 172800){ txt = "a day"; }
    else { txt = (seconds/86400).toString().split(".")[0] + " days"; }
    this.collection[0].innerText = txt;
    return this;
  }
  AGDOMO.prototype.child = function(params){
    var params = params || "";
    var link = this.linkers[0];
    var possibles = this.collection[0].childNodes;
    var idxBool = (params.indexOf(".") >= 0);
    var arr = (idxBool) ? params.split(".") : params.split("#");
    var attr = (idxBool) ? "class" : "id";
    var results;
    for (var i = 0; i < possibles.length; i++){
      if (possibles[i].nodeName != "#text" && possibles[i].getAttribute("ag-cross") == link){
        if ((!arr[0] || possibles[i].nodeName == arr[0].toUpperCase()) && (!arr[1] || possibles[i].getAttribute(attr) == arr[1]) ){
          results = possibles[i];
          break;
        }
      }
    }

    if (arguments[0] === true || arguments[1] === true){
      return agDOM(results, this.obj);
    } else {
      return results;
    }
  };
  AGDOMO.prototype.empty = function(){
    if (!document.body.contains(this.collection[0])){
      var possibles = document.querySelectorAll("[ag-id]");
      for (var i = 0; i < possibles.length; i++){
        if (possibles[i].getAttribute("ag-id") == this.agId){
          var newChoice = possibles[i];
          break;
        }
      }
      this.collection[0] = (newChoice) ? newChoice : this.collection[0];
    }
    // this.collection[0].innerHTML = "";
    while (this.collection[0].firstChild){ this.collection[0].removeChild(this.collection[0].firstChild); }
    updateTemplateByAGID(this.obj["template"], this.agId, this.collection[0]);
    return agDOM(this.collection[0], this.obj);
  };
  AGDOMO.prototype.transmute = function(elType){
    var el = document.createElement(elType);
    while (this.collection[0].firstChild){ el.appendChild(this.collection[0].firstChild); }
    attrs = this.collection[0].attributes;
    for (var i = 0; i < attrs.length; i++){
      el.setAttribute(attrs[i].nodeName, attrs[i].nodeValue);
    }
    this.collection[0].parentNode.replaceChild(el, this.collection[0]);
    updateTemplateByAGID(this.obj["template"], this.agId, el);
    return agDOM(el, this.obj);
  };
  AGDOMO.prototype.destroy = function(){
    this.collection[0].parentNode.removeChild(this.collection[0]);
    updateTemplateByAGID(this.obj["template"], this.agId, this.collection[0],{destroy: true});
    return true;
  };

  var agDOM = AntiGravity.agDOM = (function (){
    return function(els, obj){
      return new AGDOMO(els, obj);
    };
  })()

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
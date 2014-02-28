(function(root){
  //A framework so light it floats!!
  var AntiGravity = root.AntiGravity = (root.AntiGravity || {});
  var Controller = AntiGravity.Controller = function Controller(object){
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this[k[i]] = object[k[i]];
    }
  };

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
  }

  Model.prototype.urlSubstitute = function(url, obj){
    var arr = path.match(/:(.*?)(\/|$)/g) || [];
    // var params = {};
    for (var i = 0; i < arr.length; i++){
      var str = arr[i].replace(/[\/:]/g, '');
      var value = obj[str];
      url = url.replace(/:(.*?)(\/|$)/, value)
      // params[str] = value;
    }

    return url;
  }

  Model.prototype.fetchWhere = function(attrs, cb){
    var self = this;
    var keys = Object.keys(attrs);
    var qString = "?";
    var qArr = [];
    for (var i = 0; i < keys.length; i++){
      qArr.push(encodeURIComponent(keys[i]) + "=" + encodeURIComponent(attrs[keys[i]]));
    }
    qString += qArr.join("&");
    $.ajax({
      type: "GET",
      url: this.singleURL + "qString",
      success: function(resp){
        self.pojos.push(resp)
        self.pojoIDs.push(resp["id"])
        cb();
      }
    })
  };

  Model.prototype.fetchAllWhere = function(attrs, cb){
    var keys = Object.keys(attrs);
    var qString = "?";
    var qArr = [];
    var cb = cb;
    for (var i = 0; i < keys.length; i++){
      qArr.push(encodeURIComponent(keys[i]) + "=" + encodeURIComponent(attrs[keys[i]]));
    }
    qString += qArr.join("&");
    var self = this;
    $.ajax({
      type: "GET",
      url: this.allURL + qString,
      success: function(resp){
        // self.pojos = self.pojos.concat(resp);
        if (typeof resp == "object"){
          for (var i = 0; i < resp.length; i++){
            self.pojos[self.pojos.length] = resp[i];
            self.pojoIDs.push(resp[i]["id"]*1)
          }
        }
        // self.pojos += JSON.parse(resp)
        cb();
      }
    })
  };

  Model.prototype.singleSave = function(pojo, cb){
    var self = this;
    $.ajax({
      type:"POST",
      url: this.postURL ? this.urlSubstitute(this.postURL, pojo) : this.singleURL,
      data: pojo,
      success: function(resp){
        if (!!resp){
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
        }
        
        cb();
      }
    })
  }

  Model.prototype.singleUpdate = function(pojo, cb){
    var self = this;
    $.ajax({
      type:"PUT",
      url: this.putURL ? this.urlSubstitute(this.putURL, pojo) : this.singleURL,
      data: pojo,
      success: function(resp){
        //find pojo in this.pojos with same id
        for (var i = 0; i < self.pojos.length; i++){
          if (self.pojos[i]["id"] == resp["id"]){
            self.pojos[i] = resp;
            break;
          }
        }
        cb();
      }
    })
  };

  Model.prototype.singleDestroy = function(pojo, cb){
    var self = this;
    $.ajax({
      type:"DELETE",
      url: this.deleteURL ? this.urlSubstitute(this.deleteURL, pojo) : this.singleURL,
      data: pojo,
      success: function(resp){
        for (var i = 0; i < self.pojos.length; i++){
          if (self.pojos[i]["id"] == (resp["id"] || pojo["id"])){
            self.pojos.splice(i,1);
            break;
          }
        }
        cb();
      }
    })
  };

  var View = AntiGravity.View = function View(object){
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this[k[i]] = object[k[i]];
    }

    this.renderStyle = function(obj){}

  };

  View.prototype.renderView = function(){
    var template = document.getElementById(this.renderId);
    var str = AntiGravity.originalRenders[this.renderId].cloneNode(true).innerHTML;
    var arr = str.match(/{{(.*?)}}/g) || [];
    for (var i = 0; i < arr.length; i++){
      var sub = arr[i].substring(2,arr[i].length-2);
      var rep = sub.replace(/\s+/g, '');
      var insert = this[rep];
      arr[i] = (typeof insert == "function") ? insert.call(this) : escapeHTML(insert);//calling the function should return stringy code!
    }
    var arr2 = str.replace(/{{(.*?)}}/g,"$#%$#%").split("$#%$#%");
    var result = "";
    for (var i = 0; i < arr2.length; i++){
      result += arr2[i] + (arr[i] || "");
    }

    template.innerHTML = result;
    for (var i=0; i < activeRouters.length; i++){
      activeRouters[i].updateRoutes();
    }
    template.style.display = "block";
  };


  View.prototype.unrenderView = function(){
    var template = document.getElementById(this.renderId);
    template.style.display = "none";
  }

  View.prototype.unrenderStyle = function(obj){
    if (obj["classes"]){
      var classes = obj["classes"];
      var elements = null;
      for (var i = 0; i < classes.length; i++){
        elements = (elements) ? elements + document.getElementsByClassName(obj["classes"][i]) : document.getElementsByClassName(obj["classes"][i])
      }
      for (var i = 0; i < elements.length; i++){
        elements[i].style.display = "none";
      }
    }
    if (obj["elements"]){
      var types = obj["elements"];
      var elements = null;
      for (var i = 0; i < types.length; i++){
        elements = (elements) ? elements + document.getElementsByTagName(obj["elements"][i]) : document.getElementsByTagName(obj["elements"][i])
      }
      for (var i = 0; i < elements.length; i++){
        elements[i].style.display = "none";
      }
      //document.getElementsByTagName()
    }
    if (obj["ids"]){
      var types = obj["ids"];
      var elements = null;
      for (var i = 0; i < types.length; i++){
        elements = (elements) ? elements + document.getElementById(obj["ids"][i]) : document.getElementById(obj["ids"][i])
      }
      for (var i = 0; i < elements.length; i++){
        elements[i].style.display = "none";
      }
      //document.getElementById()
    }
  }

  View.prototype.renderViewPartial = function(partialId, object){
    var template = document.getElementById(partialId);
    var str = template.innerHTML;
    var arr = str.match(/{{(.*?)}}/g) || [];
    for (var i = 0; i < arr.length; i++){
      var sub = arr[i].substring(2,arr[i].length-2);
      var rep = sub.replace(/\s+/g, '');
      var insert = object[rep];
      arr[i] = (typeof insert == "function") ? insert.call(object) : escapeHTML(insert);//calling the function should return stringy code!
      arr[i] = (arr[i] == "undefined" && typeof this[rep] == "function") ? this[rep](object) : arr[i];
    }
    var arr2 = str.replace(/{{(.*?)}}/g,"$#%$#%").split("$#%$#%");
    var result = "";
    for (var i = 0; i < arr2.length; i++){
      result += arr2[i] + (arr[i] || "");
    }
    for (var i=0; i < activeRouters.length; i++){
      activeRouters[i].updateRoutes();
    }

    result += "";
    return result;
  };

  View.prototype.renderPartialNearTarget = function(partialId, object, target){
    var template = document.getElementById(partialId);
    var str = template.innerHTML;
    var arr = str.match(/{{(.*?)}}/g) || [];
    for (var i = 0; i < arr.length; i++){
      var sub = arr[i].substring(2,arr[i].length-2);
      var rep = sub.replace(/\s+/g, '');
      var insert = object[rep];
      arr[i] = (typeof insert == "function") ? insert.call(object) : escapeHTML(insert);//calling the function should return stringy code!
      arr[i] = (arr[i] == "undefined" && typeof this[rep] == "function") ? this[rep](object) : arr[i];
    }
    var arr2 = str.replace(/{{(.*?)}}/g,"$#%$#%").split("$#%$#%");
    var result = "";
    for (var i = 0; i < arr2.length; i++){
      result += arr2[i] + (arr[i] || "");
    }

    result += "";
    var parentsChildren = target.parentNode.childNodes;
    var appendZone = null;
    for (var i = 0; i < parentsChildren.length; i++){
      if(parentsChildren[i].tagName && parentsChildren[i].tagName == partialId.toUpperCase()){ 
        appendZone = parentsChildren[i];
        break; 
      }
    }

    if (appendZone){
      appendZone.innerHTML = result;
      for (var i=0; i < activeRouters.length; i++){
        activeRouters[i].updateRoutes();
      }
    }
  }

  View.prototype.styleTagNearTarget = function(tagName, target, options){
    var parentsChildren = target.parentNode.childNodes;
    var newTarget = null;
    for (var i = 0; i < parentsChildren.length; i++){
      if(parentsChildren[i].tagName && parentsChildren[i].tagName == tagName.toUpperCase()){ 
        newTarget = parentsChildren[i];
        break; 
      }
    }
    if (newTarget){
      var keys = Object.keys(options);
      for (var i = 0; i < keys.length; i++){
        newTarget.style[keys[i]] = options[keys[i]];
      }
    }
    
  };

  
  var viewTethers = [];

  var activeMigrations = AntiGravity.activeMigrations = {};
  View.prototype.styleMigration = function(obj){
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++){
      if (!activeMigrations[keys[i]]){
        activeMigrations[keys[i]] = {};
        var el = obj[keys[i]];
        var styles = Object.keys(obj[keys[i]])
        for (var j = 0; j < styles.length; j++){
          activeMigrations[keys[i]][styles[j]] = el.style[styles[j]];
          el.style[styles[j]] = obj[keys[i]][styles[j]];//style key = value
        }
      } else {
        var el = activeMigrations[keys[i]];
        var styles = Object.keys(activeMigrations[keys[i]]) 
        for (var j = 0; j < styles.length; j++){
          el.style[styles[j]] = activeMigrations[keys[i]][styles[j]];//style key = value
        }
        obj[keys[i]] = null;
      }
    }
  };

  View.prototype.filter = function(collectionObject, value, attr){
    var keys = Object.keys(collectionObject);
    var v = value.toLowerCase();
    for (var j = 0; j < keys.length; j++){
      this[keys[j]] = [];
      for (var i = 0; i < collectionObject[keys[j]].length; i++){
        if (collectionObject[keys[j]][i][attr].toLowerCase().split(v).length > 1){
          this[keys[j]].push(collectionObject[keys[j]][i])
        }
      }
    }

    this.renderView();
  }

  //active attribute toggling among siblings?

  var activeRouters = AntiGravity.activeRouters = [];
  var Router = AntiGravity.Router = function Router(object){
    activeRouters.push(this);
    var object = object || {};
    this.routes = {};// "path": "controller.action?"
    var k = Object.keys(object);
    for (var i = 0; i < k.length; i++){
      this.routes[k[i]] = object[k[i]];
    }

    this.updateRoutes();
    //target.addEventListener('action', callback, false);

  };

  Router.prototype.parseAction = function(path, event){
    var arr = path.match(/:(.*?)(\/|$)/g) || [];
    var el = event.target;
    var params = {};
    for (var i = 0; i < arr.length; i++){
      var str = arr[i].replace(/[\/:]/g,'');
      var value = el.getAttribute('path-' + str);
      params[str] = value;
    }

    //what about forms???
    //loop through all the children, if they have a name set that on params?
    var children = el.children;
    var clear = el.getAttribute("clear-after");
    var destroy = el.getAttribute("destroy-after");
    for (var i = 0; i < children.length; i++){
      var name = children[i].getAttribute('name');
      if (name){
        //if name is nested eg note[title]
        //params[note] = params[note] || {};
        //params[note][title] = children[i].value

        //params[name] = children[i].value;

        var _parseToObj = function(array){
          var a = array.slice();
          var result = {}
          var k = a.shift();
          if (a.length == 1){
            result[k] = a[0];
            return result;
          }
          result[k] = _parseToObj(a);
          return result;
        }

        var splitArr = name.split(/\[(.*?)\]/);
        splitArr.push(children[i].value);
        var hashArr = [];
        for (var j = 0; j < splitArr.length; j++){
          if (splitArr[j] != ""){
            hashArr.push(splitArr[j]);
          }
        }

        var obj = _parseToObj(hashArr);
        if (params[hashArr[0]]){
          var _mergeOptions = function(obj1,obj2){
            var obj3 = {};
            for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
            for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
            return obj3;
          }
          params[hashArr[0]] = _mergeOptions(obj[hashArr[0]], params[hashArr[0]]);
        } else {
          params[hashArr[0]] = obj[hashArr[0]]
        }

        if (clear){
          children[i].value = null;
        }
      }
    }
    var name = el.getAttribute('name');
    if (name){
      params[name] = el.value;
      if (clear){
          el.value = null;
        }
    }
    if (destroy){
      el.parentNode.removeChild(el);
    }

    event.preventDefault();
    event.stopPropagation();
    this.routes[path](params, event);
  };

  Router.prototype.updateRoutes = function(){
    this.routeDOMObjects = document.querySelectorAll('[route]');
    for (var i = 0; i < this.routeDOMObjects.length; i++){
      var target = this.routeDOMObjects[i]
      var routeObj = JSON.parse(target.getAttribute('route'));
      var actions = Object.keys(routeObj);
      for (var j = 0; j < actions.length; j++){
        try{
          //target.addEventListener(actions[j],this.parseAction.bind(this,routeObj[actions[j]]),false);
          //target.addEventListener(actions[j],preventDef,false);
          //done this way because the listeners were piling up and freezing the window
          target["on" + actions[j]] = this.parseAction.bind(this,routeObj[actions[j]]);
        } catch(e) {
          console.log(e.message);
        }
      }
    }
  }

  originalRenders = AntiGravity.originalRenders = {};

  var renders = document.getElementsByTagName("render");
  var partials = document.getElementsByTagName("partial");
  for (var i = 0; i < renders.length; i++){
    renders[i].style.display = "none";
    AntiGravity.originalRenders[renders[i].getAttribute("id")] = renders[i].cloneNode(true);
  }
  for (var i = 0; i < partials.length; i++){
    partials[i].style.display = "none";
  }

  escapeHTML = AntiGravity.escapeHTML = function escapeHTML(string){
    var pre = document.createElement('pre');
    var text = document.createTextNode( string );
    pre.appendChild(text);
    return pre.innerHTML;
  }

})(this);
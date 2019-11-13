import {from} from 'rxjs'
import { concatMap, timeout, catchError, delay } from 'rxjs/operators';

const prom = () => {
 return new Promise((resolve) => {
   setTimeout(() => {console.log('yah'); resolve('test')}, 3000 )
 })
}



from(prom())
  .pipe(timeout(1000))
  .subscribe(
      res => console.log(res, 'res'),
      err => console.log(err, 'err')
  )
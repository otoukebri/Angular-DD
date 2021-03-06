import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { combineLatest, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, map, shareReplay, tap, switchMap } from 'rxjs/operators';

import { Product } from './product';
import { ProductCategory } from '../product-categories/product-category';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { Supplier } from '../suppliers/supplier';
import { SupplierService } from '../suppliers/supplier.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';

  // All products
  // Instead of defining the http.get in a method in the service,
  // set the observable directly
  // Use shareReplay to "replay" the data from the observable
  // Subscription remains even if there are no subscribers (navigating to the Welcome page for example)
  products$ = this.http.get<Product[]>(this.productsUrl)
    .pipe(
      tap(console.table),
      shareReplay(),
      catchError(this.handleError)
    );

  // All products with category id mapped to category name
  // Be sure to specify the type after the map to ensure that it knows the correct type
  productsWithCategory$ = combineLatest(
    this.products$,
    this.productCategoryService.productCategories$
  ).pipe(
    map(([products, categories]: [Product[], ProductCategory[]]) =>
      products.map(
        p =>
          ({
            ...p,
            category: categories.find(c =>
              p.categoryId === c.id).name
          } as Product) // <-- note the type here!
      )
    ),
    shareReplay()
  );

  private productSelectedAction = new BehaviorSubject<number>(0);

  // Currently selected product
  // Used in both List and Detail pages,
  // so use the shareReply to share it with any component that uses it
  // Location of the shareReplay matters ... won't share anything *after* the shareReplay
  selectedProduct$ = combineLatest(
    this.productSelectedAction,
    this.productsWithCategory$
  ).pipe(
    map(([selectedProductId, products]) =>
      products.find(product => product.id === selectedProductId)
    ),
    tap(product => console.log('selectedProduct', product)),
    shareReplay(),
    catchError(this.handleError)
  );

  selectedProductSuppliers$ = combineLatest(
    this.selectedProduct$,
    this.supplierService.suppliers$
  ).pipe(
    map(([product, suppliers]: [Product, Supplier[]]) =>
      suppliers.filter(
        supplier => product ? product.supplierIds.includes(supplier.id) : of(null)
      )
    )
  );

  constructor(
    private http: HttpClient,
    private productCategoryService: ProductCategoryService,
    private supplierService: SupplierService
  ) { }

  // Change the selected product
  changeSelectedProduct(selectedProductId: number | null): void {
    this.productSelectedAction.next(selectedProductId);
  }

  private handleError(err) {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (typeof (err) === 'string') {
      errorMessage = err;
    } else {
      if (err.error instanceof ErrorEvent) {
        // A client-side or network error occurred. Handle it accordingly.
        errorMessage = `An error occurred: ${err.error.message}`;
      } else {
        // The backend returned an unsuccessful response code.
        // The response body may contain clues as to what went wrong,
        errorMessage = `Backend returned code ${err.status}: ${err.body.error}`;
      }
    }
    console.error(err);
    return throwError(errorMessage);
  }
}
